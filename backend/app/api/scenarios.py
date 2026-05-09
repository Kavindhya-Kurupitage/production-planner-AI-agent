from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agent.planner import run_agent
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.scenario import Scenario
from app.models.user import User
from app.schemas.scenario import ScenarioResponse, ScenarioRunRequest, ScenarioRunResponse

router = APIRouter(prefix="/companies", tags=["scenarios"])


def _get_user_company_or_404(db: Session, company_id: int, user_id: int) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.owner_id == user_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company


@router.post("/{company_id}/scenarios", response_model=ScenarioRunResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    company_id: int,
    payload: ScenarioRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioRunResponse:
    _get_user_company_or_404(db, company_id, current_user.id)
    result: dict[str, Any] = await run_agent(question=payload.question, company_id=company_id, db=db)

    scenario = Scenario(
        company_id=company_id,
        user_id=current_user.id,
        question=payload.question,
        narrative_summary=result["narrative_summary"],
        simulation_result=result["simulation"],
        bottlenecks=result["bottlenecks"],
        action_plan=result["action_plan"],
        agent_score=result["agent_score"],
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    return ScenarioRunResponse(
        id=scenario.id,
        question=scenario.question,
        narrative_summary=scenario.narrative_summary,
        simulation_result=result["simulation"],
        bottlenecks=result["bottlenecks"],
        action_plan=result["action_plan"],
        agent_score=scenario.agent_score,
        created_at=scenario.created_at,
    )


@router.get("/{company_id}/scenarios", response_model=list[ScenarioResponse])
def list_scenarios(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScenarioResponse]:
    _get_user_company_or_404(db, company_id, current_user.id)
    scenarios = (
        db.query(Scenario)
        .filter(Scenario.company_id == company_id, Scenario.user_id == current_user.id)
        .order_by(Scenario.created_at.desc())
        .all()
    )
    return [ScenarioResponse.model_validate(item) for item in scenarios]


@router.get("/{company_id}/scenarios/{scenario_id}", response_model=ScenarioResponse)
def get_scenario(
    company_id: int,
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScenarioResponse:
    _get_user_company_or_404(db, company_id, current_user.id)
    scenario = (
        db.query(Scenario)
        .filter(
            Scenario.id == scenario_id,
            Scenario.company_id == company_id,
            Scenario.user_id == current_user.id,
        )
        .first()
    )
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found.")
    return ScenarioResponse.model_validate(scenario)
