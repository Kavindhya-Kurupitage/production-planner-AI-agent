import asyncio
import os
import sys
import unittest
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.api.production import upload_production_data  # noqa: E402
from app.models.company import Company  # noqa: E402
from app.models.production import ProductionData  # noqa: E402
from app.models.user import User  # noqa: E402


class ProductionUploadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        TestingSessionLocal = sessionmaker(bind=self.engine, class_=Session)
        User.__table__.create(bind=self.engine)
        Company.__table__.create(bind=self.engine)
        ProductionData.__table__.create(bind=self.engine)
        self.db = TestingSessionLocal()

        self.user = User(
            email="owner@example.com",
            hashed_password="not-used",
            full_name="Owner",
            is_active=True,
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

        self.company = Company(
            name="Acme Manufacturing",
            industry="Manufacturing",
            main_constraint="Capacity",
            priority_metric="Throughput",
            owner_id=self.user.id,
        )
        self.db.add(self.company)
        self.db.commit()
        self.db.refresh(self.company)

    def tearDown(self) -> None:
        self.db.close()
        ProductionData.__table__.drop(bind=self.engine)
        Company.__table__.drop(bind=self.engine)
        User.__table__.drop(bind=self.engine)
        self.engine.dispose()

    def _upload_file(self, csv_text: str) -> UploadFile:
        return UploadFile(file=BytesIO(csv_text.encode("utf-8")), filename="production.csv")

    def _rows(self) -> list[ProductionData]:
        return (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.product_name.asc())
            .all()
        )

    def test_upload_replaces_existing_company_production_data(self) -> None:
        stale_row = ProductionData(
            company_id=self.company.id,
            product_name="Stale Widget",
            daily_capacity=10,
            current_demand=20,
            stock_level=30,
            lead_time_days=4,
        )
        self.db.add(stale_row)
        self.db.commit()

        csv_text = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,500,450,1000,3",
                "Widget-B,400,420,650,5",
            ]
        )

        response = asyncio.run(
            upload_production_data(
                self.company.id,
                file=self._upload_file(csv_text),
                db=self.db,
                current_user=self.user,
            )
        )

        self.assertEqual(response.rows_uploaded, 2)
        self.assertEqual(response.products, ["Widget-A", "Widget-B"])
        self.assertEqual([row.product_name for row in self._rows()], ["Widget-A", "Widget-B"])

    def test_reuploading_same_csv_does_not_duplicate_planner_inputs(self) -> None:
        csv_text = "\n".join(
            [
                "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                "Widget-A,500,450,1000,3",
                "Widget-B,400,420,650,5",
            ]
        )

        for _ in range(2):
            asyncio.run(
                upload_production_data(
                    self.company.id,
                    file=self._upload_file(csv_text),
                    db=self.db,
                    current_user=self.user,
                )
            )

        rows = self._rows()
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            [(row.product_name, row.daily_capacity, row.current_demand) for row in rows],
            [("Widget-A", 500, 450), ("Widget-B", 400, 420)],
        )


if __name__ == "__main__":
    unittest.main()
