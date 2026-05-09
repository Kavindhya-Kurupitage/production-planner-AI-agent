from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class ProductionData(Base):
    __tablename__ = "production_data"
    __table_args__ = (
        Index("ix_production_data_company_id", "company_id"),
        Index("ix_production_data_product_name", "product_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    daily_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    current_demand: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_level: Mapped[int] = mapped_column(Integer, nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company = relationship("Company", back_populates="production_data")
