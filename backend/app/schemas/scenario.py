from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ScenarioRunRequest(BaseModel):
    question: str = Field(min_length=3)


class ScenarioRunResponse(BaseModel):
    id: int
    question: str
    narrative_summary: str
    simulation_result: dict[str, Any]
    bottlenecks: list[dict[str, Any]]
    action_plan: dict[str, Any]
    agent_score: int
    created_at: datetime


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    user_id: int
    question: str
    narrative_summary: str
    simulation_result: dict[str, Any]
    bottlenecks: list[dict[str, Any]]
    action_plan: dict[str, Any]
    agent_score: int
    created_at: datetime
