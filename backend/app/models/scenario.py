from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Scenario(Base):
    __tablename__ = "scenarios"
    __table_args__ = (
        Index("ix_scenarios_company_id", "company_id"),
        Index("ix_scenarios_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    simulation_result: Mapped[dict] = mapped_column(JSONB, nullable=False)
    narrative_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    bottlenecks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    action_plan: Mapped[dict] = mapped_column(JSONB, nullable=False)
    agent_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company = relationship("Company", back_populates="scenarios")
    user = relationship("User", back_populates="scenarios")


class BenchmarkResult(Base):
    __tablename__ = "benchmark_results"
    __table_args__ = (Index("ix_benchmark_results_company_id", "company_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    agent_score: Mapped[float] = mapped_column(Float, nullable=False)
    default_score: Mapped[float] = mapped_column(Float, nullable=False)
    comparison_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company = relationship("Company", back_populates="benchmark_results")
