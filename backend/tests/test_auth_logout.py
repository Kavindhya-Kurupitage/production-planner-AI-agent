import os
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_value_12345")

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import router as auth_router
from app.core.database import get_db
from app.models import Base
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User


class AuthLogoutTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        Base.metadata.create_all(
            bind=self.engine,
            tables=[User.__table__, TokenBlacklist.__table__],
        )
        self.SessionLocal = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

        app = FastAPI()
        app.include_router(auth_router)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self) -> None:
        Base.metadata.drop_all(
            bind=self.engine,
            tables=[TokenBlacklist.__table__, User.__table__],
        )
        self.engine.dispose()

    def test_logout_revokes_refresh_token_for_current_session(self) -> None:
        register_response = self.client.post(
            "/auth/register",
            json={
                "email": "owner@example.com",
                "password": "secure-password",
                "full_name": "Production Owner",
            },
        )
        self.assertEqual(register_response.status_code, 201)
        tokens = register_response.json()["tokens"]

        logout_response = self.client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(logout_response.status_code, 200)

        refresh_response = self.client.post(
            "/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        self.assertEqual(refresh_response.status_code, 401)
        self.assertEqual(refresh_response.json()["detail"], "Refresh token has been revoked.")


if __name__ == "__main__":
    unittest.main()
