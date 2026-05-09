from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class ProductionPlan(Base):
    __tablename__ = "production_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    target_units: Mapped[int] = mapped_column(Integer, nullable=False)
    timeframe_days: Mapped[int] = mapped_column(Integer, nullable=False)
    constraints: Mapped[str] = mapped_column(Text, nullable=False)
    generated_plan: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
