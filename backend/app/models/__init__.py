from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.company import Company
from app.models.planner import ProductionPlan
from app.models.production import ProductionData
from app.models.scenario import BenchmarkResult, Scenario
from app.models.token_blacklist import TokenBlacklist
from app.models.user import User

__all__ = [
    "Base",
    "User",
    "Company",
    "ProductionData",
    "Scenario",
    "BenchmarkResult",
    "ProductionPlan",
    "TokenBlacklist",
]
