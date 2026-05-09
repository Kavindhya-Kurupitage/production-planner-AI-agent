from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    industry: str = Field(min_length=2, max_length=120)
    main_constraint: str = Field(min_length=2)
    priority_metric: str = Field(min_length=2, max_length=120)


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    industry: str | None = Field(default=None, min_length=2, max_length=120)
    main_constraint: str | None = Field(default=None, min_length=2)
    priority_metric: str | None = Field(default=None, min_length=2, max_length=120)


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    industry: str
    main_constraint: str
    priority_metric: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
