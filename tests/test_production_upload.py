import asyncio
import os
import sys
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import unittest

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.production import upload_production_data
from app.models import Base
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User


class ProductionUploadTests(unittest.TestCase):
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
        self.db.add_all([self.user, self.company])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.company)

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _csv_upload(self, body: str) -> SimpleNamespace:
        return SimpleNamespace(filename="production.csv", file=BytesIO(body.encode("utf-8")))

    def test_reupload_replaces_existing_company_production_data(self) -> None:
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

        asyncio.run(
            upload_production_data(
                company_id=self.company.id,
                file=self._csv_upload(first_csv),
                db=self.db,
                current_user=self.user,
            )
        )
        asyncio.run(
            upload_production_data(
                company_id=self.company.id,
                file=self._csv_upload(second_csv),
                db=self.db,
                current_user=self.user,
            )
        )

        rows = (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.product_name.asc())
            .all()
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].product_name, "Widget-A")
        self.assertEqual(rows[0].daily_capacity, 200)
        self.assertEqual(rows[0].current_demand, 180)


if __name__ == "__main__":
    unittest.main()
