import json

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


WEAK_JWT_SECRET_PLACEHOLDERS = {
    "change-me",
    "change-me-to-a-long-random-secret",
    "your-random-secret",
    "long-random-string",
    "replace-with-64-hex-characters",
}


class Settings(BaseSettings):
    app_name: str = "Production Planner Agent API"
    api_prefix: str = "/api/v1"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/production_planner"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                try:
                    parsed = json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if str(origin).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret_key(cls, value: str) -> str:
        secret = value.strip()
        normalized_secret = secret.lower().replace("_", "-").replace(" ", "-")
        if (
            secret == ""
            or len(secret) < 16
            or normalized_secret in WEAK_JWT_SECRET_PLACEHOLDERS
        ):
            raise ValueError(
                "JWT_SECRET_KEY must be set to a strong, private secret "
                "(minimum 16 characters; do not use documented placeholders)."
            )
        return secret


settings = Settings()
