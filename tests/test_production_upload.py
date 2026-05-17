import os
import sys
import unittest
from io import BytesIO

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.production import upload_production_data
from app.models import Base
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User


class ProductionUploadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        Base.metadata.create_all(bind=self.engine)
        session_factory = sessionmaker(bind=self.engine, autocommit=False, autoflush=False, class_=Session)
        self.db = session_factory()
        self.user = User(
            email="planner@example.com",
            hashed_password="not-used",
            full_name="Planner User",
        )
        self.company = Company(
            name="Acme Manufacturing",
            industry="Manufacturing",
            main_constraint="Capacity",
            priority_metric="Speed",
            owner=self.user,
        )
        self.db.add_all([self.user, self.company])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.company)

    def tearDown(self) -> None:
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    @staticmethod
    def _csv_upload(content: str, filename: str = "production.csv") -> UploadFile:
        return UploadFile(file=BytesIO(content.encode("utf-8")), filename=filename)

    def _production_rows(self) -> list[ProductionData]:
        return (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.product_name.asc())
            .all()
        )

    async def test_reupload_replaces_existing_company_rows(self) -> None:
        first_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,500,450,1000,3",
                "Widget-B,400,420,650,5",
            ]
        )
        second_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,600,480,900,4",
            ]
        )

        first_response = await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(first_csv, "first.csv"),
            db=self.db,
            current_user=self.user,
        )
        self.assertEqual(first_response.rows_uploaded, 2)
        self.assertEqual(len(self._production_rows()), 2)

        second_response = await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(second_csv, "second.csv"),
            db=self.db,
            current_user=self.user,
        )

        rows = self._production_rows()
        self.assertEqual(second_response.rows_uploaded, 1)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].product_name, "Widget-A")
        self.assertEqual(rows[0].daily_capacity, 600)
        self.assertEqual(rows[0].current_demand, 480)

    async def test_invalid_reupload_preserves_existing_rows(self) -> None:
        valid_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,500,450,1000,3",
            ]
        )
        invalid_csv = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-B,not-a-number,420,650,5",
            ]
        )

        await upload_production_data(
            company_id=self.company.id,
            file=self._csv_upload(valid_csv, "valid.csv"),
            db=self.db,
            current_user=self.user,
        )

        with self.assertRaises(HTTPException):
            await upload_production_data(
                company_id=self.company.id,
                file=self._csv_upload(invalid_csv, "invalid.csv"),
                db=self.db,
                current_user=self.user,
            )

        rows = self._production_rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].product_name, "Widget-A")
        self.assertEqual(rows[0].daily_capacity, 500)


if __name__ == "__main__":
    unittest.main()
