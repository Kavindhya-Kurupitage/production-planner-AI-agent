import os
import sys
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.production import upload_production_data
from app.models import Base
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User


class ProductionUploadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(
            bind=self.engine,
            tables=[User.__table__, Company.__table__, ProductionData.__table__],
        )
        self.session_factory = sessionmaker(bind=self.engine, class_=Session)
        self.db = self.session_factory()
        self.user = User(
            email="owner@example.com",
            hashed_password="hashed",
            full_name="Owner",
            is_active=True,
        )
        self.company = Company(
            name="Factory",
            industry="Manufacturing",
            main_constraint="Capacity",
            priority_metric="Cost Reduction",
            owner=self.user,
        )
        self.other_user = User(
            email="other@example.com",
            hashed_password="hashed",
            full_name="Other Owner",
            is_active=True,
        )
        self.other_company = Company(
            name="Other Factory",
            industry="Manufacturing",
            main_constraint="Inventory",
            priority_metric="Throughput",
            owner=self.other_user,
        )
        self.db.add_all([self.user, self.company, self.other_user, self.other_company])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.company)
        self.db.refresh(self.other_company)

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    @staticmethod
    def _csv_upload(body: str) -> SimpleNamespace:
        return SimpleNamespace(filename="production.csv", file=BytesIO(body.encode("utf-8")))

    def _production_rows(self, company_id: int | None = None) -> list[ProductionData]:
        target_company_id = self.company.id if company_id is None else company_id
        return (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == target_company_id)
            .order_by(ProductionData.product_name.asc())
            .all()
        )

    async def test_reupload_replaces_existing_company_production_data(self) -> None:
        first_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,100,90,30,3",
                "Widget-B,50,45,20,5",
            ]
        )
        second_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,200,180,60,4",
            ]
        )
        other_company_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Other-Widget,75,70,25,2",
            ]
        )

        await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(first_csv),
            db=self.db,
            current_user=self.user,
        )
        await upload_production_data(
            company_id=self.other_company.id,
            file=self._csv_upload(other_company_csv),
            db=self.db,
            current_user=self.other_user,
        )
        response = await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(second_csv),
            db=self.db,
            current_user=self.user,
        )

        rows = self._production_rows()
        self.assertEqual(response.rows_uploaded, 1)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].product_name, "Widget-A")
        self.assertEqual(rows[0].daily_capacity, 200)
        self.assertEqual(rows[0].current_demand, 180)
        self.assertEqual(len(self._production_rows(self.other_company.id)), 1)

    async def test_invalid_reupload_preserves_existing_company_rows(self) -> None:
        valid_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,100,90,30,3",
            ]
        )
        invalid_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-B,not-a-number,45,20,5",
            ]
        )

        await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(valid_csv),
            db=self.db,
            current_user=self.user,
        )

        with self.assertRaises(HTTPException):
            await upload_production_data(
                company_id=self.company.id,
                file=self._csv_upload(invalid_csv),
                db=self.db,
                current_user=self.user,
            )

        rows = self._production_rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].product_name, "Widget-A")
        self.assertEqual(rows[0].daily_capacity, 100)

    async def test_duplicate_product_names_are_rejected(self) -> None:
        duplicate_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,100,90,30,3",
                "Widget-A,120,95,25,4",
            ]
        )

        with self.assertRaises(HTTPException) as raised:
            await upload_production_data(
                company_id=self.company.id,
                file=self._csv_upload(duplicate_csv),
                db=self.db,
                current_user=self.user,
            )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(self._production_rows(), [])


if __name__ == "__main__":
    unittest.main()
