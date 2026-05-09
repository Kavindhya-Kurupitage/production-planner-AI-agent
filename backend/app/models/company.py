from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class Company(Base):
    __tablename__ = "companies"
    __table_args__ = (Index("ix_companies_owner_id", "owner_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    main_constraint: Mapped[str] = mapped_column(Text, nullable=False)
    priority_metric: Mapped[str] = mapped_column(String(120), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("User", back_populates="companies")
    production_data = relationship(
        "ProductionData", back_populates="company", cascade="all, delete-orphan"
    )
    scenarios = relationship("Scenario", back_populates="company", cascade="all, delete-orphan")
    benchmark_results = relationship(
        "BenchmarkResult", back_populates="company", cascade="all, delete-orphan"
    )
