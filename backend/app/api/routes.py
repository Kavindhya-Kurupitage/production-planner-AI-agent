from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.services.planner_service import PlannerService

router = APIRouter(prefix="/planner", tags=["planner"])
planner_service = PlannerService()
MAX_PLAN_CONSTRAINTS_LENGTH = 2000


class PlanRequest(BaseModel):
    product_name: str = Field(min_length=2, max_length=150)
    target_units: int = Field(gt=0)
    timeframe_days: int = Field(gt=0)
    constraints: str = Field(min_length=3, max_length=MAX_PLAN_CONSTRAINTS_LENGTH)


class PlanResponse(BaseModel):
    id: int
    product_name: str
    target_units: int
    timeframe_days: int
    constraints: str
    generated_plan: str


@router.post("/generate", response_model=PlanResponse)
async def generate_plan(
    payload: PlanRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        plan = await planner_service.create_plan(
            db=db,
            product_name=payload.product_name,
            target_units=payload.target_units,
            timeframe_days=payload.timeframe_days,
            constraints=payload.constraints,
        )
        return PlanResponse(
            id=plan.id,
            product_name=plan.product_name,
            target_units=plan.target_units,
            timeframe_days=plan.timeframe_days,
            constraints=plan.constraints,
            generated_plan=plan.generated_plan,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to generate plan.") from exc
