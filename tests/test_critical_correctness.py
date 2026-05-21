import os
import sys
import unittest
from io import BytesIO
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.agent import benchmark as benchmark_module
from app.api.production import upload_production_data
from app.models import Base
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User


def _csv_upload(content: str) -> UploadFile:
    return UploadFile(filename="production.csv", file=BytesIO(content.encode("utf-8")))


class BackendCriticalCorrectnessTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        Base.metadata.create_all(
            bind=engine,
            tables=[User.__table__, Company.__table__, ProductionData.__table__],
        )
        self.session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)
        self.db = self.session_factory()
        self.user = User(
            email="owner@example.com",
            hashed_password="not-used",
            full_name="Owner User",
        )
        self.company = Company(
            name="Acme Manufacturing",
            industry="Manufacturing",
            main_constraint="Capacity",
            priority_metric="On-time delivery",
            owner=self.user,
        )
        self.db.add_all([self.user, self.company])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.company)

    def tearDown(self) -> None:
        self.db.close()

    async def test_upload_replaces_existing_company_production_rows(self) -> None:
        first_csv = (
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget A,100,80,50,3\n"
            "Widget B,40,45,12,5\n"
        )
        second_csv = (
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget C,70,65,20,2\n"
        )

        first_response = await upload_production_data(
            company_id=self.company.id,
            file=_csv_upload(first_csv),
            db=self.db,
            current_user=self.user,
        )
        second_response = await upload_production_data(
            company_id=self.company.id,
            file=_csv_upload(second_csv),
            db=self.db,
            current_user=self.user,
        )

        rows = (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.id.asc())
            .all()
        )

        self.assertEqual(first_response.rows_uploaded, 2)
        self.assertEqual(second_response.rows_uploaded, 1)
        self.assertEqual([row.product_name for row in rows], ["Widget C"])
        self.assertEqual(rows[0].daily_capacity, 70)

    async def test_benchmark_failure_aborts_instead_of_returning_synthetic_scores(self) -> None:
        self.db.add(
            ProductionData(
                company_id=self.company.id,
                product_name="Widget A",
                daily_capacity=100,
                current_demand=80,
                stock_level=50,
                lead_time_days=3,
            )
        )
        self.db.commit()

        original_plain_response = benchmark_module.get_plain_groq_response

        async def fail_plain_response(_: str) -> dict[str, object]:
            raise RuntimeError("upstream model unavailable")

        benchmark_module.get_plain_groq_response = fail_plain_response
        try:
            with self.assertRaises(HTTPException) as raised:
                await benchmark_module.run_full_benchmark(company_id=self.company.id, db=self.db)
        finally:
            benchmark_module.get_plain_groq_response = original_plain_response

        self.assertEqual(raised.exception.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("No result was saved", str(raised.exception.detail))


if __name__ == "__main__":
    unittest.main()
