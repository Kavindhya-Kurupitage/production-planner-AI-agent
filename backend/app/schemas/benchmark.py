from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class BenchmarkRunResponse(BaseModel):
    benchmark_id: int
    company_id: int
    agent_score: float
    default_score: float
    comparison_data: dict[str, Any]
    created_at: datetime


class BenchmarkResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    agent_score: float
    default_score: float
    comparison_data: dict[str, Any]
    created_at: datetime
