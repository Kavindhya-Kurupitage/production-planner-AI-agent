import os
import sys
import unittest
from io import BytesIO
from pathlib import Path

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.production import upload_production_data
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User

TEST_TABLES = (User.__table__, Company.__table__, ProductionData.__table__)


def _upload_file(csv_text: str) -> UploadFile:
    return UploadFile(filename="production.csv", file=BytesIO(csv_text.encode("utf-8")))


class ProductionUploadTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        for table in TEST_TABLES:
            table.create(bind=self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.SessionLocal()

        self.user = User(
            email="owner@example.com",
            hashed_password="hashed",
            full_name="Owner",
            is_active=True,
        )
        self.company = Company(
            name="Acme",
            industry="Manufacturing",
            main_constraint="Capacity",
            priority_metric="Speed",
            owner=self.user,
        )
        self.other_company = Company(
            name="Other Co",
            industry="Manufacturing",
            main_constraint="Cost",
            priority_metric="Cost Reduction",
            owner=self.user,
        )
        self.db.add_all([self.company, self.other_company])
        self.db.commit()
        self.db.refresh(self.company)
        self.db.refresh(self.other_company)

        self.db.add(
            ProductionData(
                company_id=self.other_company.id,
                product_name="Other-Widget",
                daily_capacity=10,
                current_demand=9,
                stock_level=100,
                lead_time_days=2,
            )
        )
        self.db.commit()

    def tearDown(self) -> None:
        self.db.close()
        for table in reversed(TEST_TABLES):
            table.drop(bind=self.engine)
        self.engine.dispose()

    async def test_repeated_upload_replaces_company_snapshot_without_duplication(self) -> None:
        csv_v1 = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,500,420,3000,7",
                "Widget-B,200,195,800,14",
            ]
        )
        csv_v2 = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,750,610,2800,6",
                "Widget-C,1000,880,12000,3",
            ]
        )

        first_response = await upload_production_data(
            company_id=self.company.id,
            file=_upload_file(csv_v1),
            db=self.db,
            current_user=self.user,
        )
        second_response = await upload_production_data(
            company_id=self.company.id,
            file=_upload_file(csv_v2),
            db=self.db,
            current_user=self.user,
        )

        self.assertEqual(first_response.rows_uploaded, 2)
        self.assertEqual(second_response.rows_uploaded, 2)

        target_rows = (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.product_name.asc())
            .all()
        )
        other_rows = (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.other_company.id)
            .all()
        )

        self.assertEqual([row.product_name for row in target_rows], ["Widget-A", "Widget-C"])
        self.assertEqual(target_rows[0].daily_capacity, 750)
        self.assertEqual(len(other_rows), 1)
        self.assertEqual(other_rows[0].product_name, "Other-Widget")


if __name__ == "__main__":
    unittest.main()
