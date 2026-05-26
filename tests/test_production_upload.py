import os
import sys
import unittest
from collections.abc import Generator
from pathlib import Path

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.production import router as production_router
from app.core.database import get_db
from app.models import Base
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User


class ProductionUploadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False, class_=Session)
        Base.metadata.create_all(
            bind=self.engine,
            tables=[User.__table__, Company.__table__, ProductionData.__table__],
        )

        with self.SessionLocal() as db:
            user = User(
                email="planner@example.com",
                hashed_password="not-used",
                full_name="Planner",
                is_active=True,
            )
            db.add(user)
            db.flush()
            company = Company(
                name="Factory",
                industry="Manufacturing",
                main_constraint="Capacity",
                priority_metric="Throughput",
                owner_id=user.id,
            )
            db.add(company)
            db.commit()
            self.user_id = user.id
            self.company_id = company.id

        app = FastAPI()
        app.include_router(production_router, prefix="/api/v1")

        def override_get_db() -> Generator[Session, None, None]:
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        def override_get_current_user() -> User:
            return User(id=self.user_id, email="planner@example.com", hashed_password="not-used", full_name="Planner")

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        Base.metadata.drop_all(
            bind=self.engine,
            tables=[ProductionData.__table__, Company.__table__, User.__table__],
        )
        self.engine.dispose()

    def _upload_csv(self, csv_body: str):
        return self.client.post(
            f"/api/v1/companies/{self.company_id}/upload",
            files={"file": ("production.csv", csv_body.encode("utf-8"), "text/csv")},
        )

    def _production_rows(self) -> list[ProductionData]:
        with self.SessionLocal() as db:
            return (
                db.query(ProductionData)
                .filter(ProductionData.company_id == self.company_id)
                .order_by(ProductionData.id.asc())
                .all()
            )

    def test_upload_replaces_existing_company_data(self) -> None:
        first_response = self._upload_csv(
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-A,100,80,50,3\n"
            "Widget-B,200,120,60,4\n"
        )
        self.assertEqual(first_response.status_code, 200)

        second_response = self._upload_csv(
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-C,300,140,70,5\n"
        )

        self.assertEqual(second_response.status_code, 200)
        rows = self._production_rows()
        self.assertEqual([row.product_name for row in rows], ["Widget-C"])
        self.assertEqual(rows[0].daily_capacity, 300)

    def test_duplicate_products_are_rejected_without_clearing_existing_data(self) -> None:
        initial_response = self._upload_csv(
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-A,100,80,50,3\n"
        )
        self.assertEqual(initial_response.status_code, 200)

        duplicate_response = self._upload_csv(
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-B,100,80,50,3\n"
            " widget-b ,120,90,60,4\n"
        )

        self.assertEqual(duplicate_response.status_code, 400)
        self.assertIn("duplicate product_name", duplicate_response.json()["detail"])
        rows = self._production_rows()
        self.assertEqual([row.product_name for row in rows], ["Widget-A"])

    def test_fractional_numeric_values_are_rejected_without_truncation(self) -> None:
        response = self._upload_csv(
            "product_name,daily_capacity,current_demand,stock_level,lead_time_days\n"
            "Widget-A,100.9,80,50,3\n"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("daily_capacity must be a whole number", response.json()["detail"])
        self.assertEqual(self._production_rows(), [])


if __name__ == "__main__":
    unittest.main()
