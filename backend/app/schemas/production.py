from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ColumnMappingReportItem(BaseModel):
    source_column: str
    target_field: str
    confidence: Literal["exact", "fuzzy", "ai_inferred"]


class ProductionDataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    product_name: str
    daily_capacity: int
    current_demand: int
    stock_level: int
    lead_time_days: int
    uploaded_at: datetime


class UploadResponse(BaseModel):
    company_id: int
    rows_uploaded: int
    columns_validated: list[str]
    products: list[str]
    mapping_report: list[ColumnMappingReportItem] = Field(default_factory=list)
    unmapped_source_columns: list[str] = Field(default_factory=list)
    ai_mapping_used: bool = False
