import os
import unittest
from io import BytesIO

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

from fastapi import HTTPException, UploadFile
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
        session_factory = sessionmaker(bind=self.engine, class_=Session, expire_on_commit=False)
        self.db = session_factory()
        self.user = User(
            email="planner@example.com",
            hashed_password="hashed-password",
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

    def tearDown(self) -> None:
        self.db.close()
        Base.metadata.drop_all(
            bind=self.engine,
            tables=[ProductionData.__table__, Company.__table__, User.__table__],
        )
        self.engine.dispose()

    async def _upload_csv(self, content: str) -> None:
        file = UploadFile(
            filename="production.csv",
            file=BytesIO(content.encode("utf-8")),
        )
        await upload_production_data(
            company_id=self.company.id,
            file=file,
            db=self.db,
            current_user=self.user,
        )

    def _production_rows(self) -> list[ProductionData]:
        return (
            self.db.query(ProductionData)
            .filter(ProductionData.company_id == self.company.id)
            .order_by(ProductionData.id.asc())
            .all()
        )

    async def test_reupload_replaces_existing_company_production_data(self) -> None:
        await self._upload_csv(
            "\n".join(
                [
                    "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                    "Widget-A,500,450,1000,3",
                ]
            )
        )

        await self._upload_csv(
            "\n".join(
                [
                    "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                    "Widget-A,650,550,800,4",
                    "Widget-B,300,250,400,2",
                ]
            )
        )

        rows = self._production_rows()
        self.assertEqual(2, len(rows))
        self.assertEqual(
            [
                ("Widget-A", 650, 550, 800, 4),
                ("Widget-B", 300, 250, 400, 2),
            ],
            [
                (
                    row.product_name,
                    row.daily_capacity,
                    row.current_demand,
                    row.stock_level,
                    row.lead_time_days,
                )
                for row in rows
            ],
        )

    async def test_invalid_reupload_keeps_existing_company_production_data(self) -> None:
        await self._upload_csv(
            "\n".join(
                [
                    "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                    "Widget-A,500,450,1000,3",
                ]
            )
        )

        with self.assertRaises(HTTPException):
            await self._upload_csv(
                "\n".join(
                    [
                        "product_name,daily_capacity,current_demand,stock_level,lead_time_days",
                        "Widget-B,not-a-number,250,400,2",
                    ]
                )
            )

        rows = self._production_rows()
        self.assertEqual(1, len(rows))
        self.assertEqual("Widget-A", rows[0].product_name)
        self.assertEqual(500, rows[0].daily_capacity)


if __name__ == "__main__":
    unittest.main()
