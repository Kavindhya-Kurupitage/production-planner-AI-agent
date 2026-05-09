from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agent.benchmark import run_full_benchmark
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.scenario import BenchmarkResult
from app.models.user import User
from app.schemas.benchmark import BenchmarkResultResponse, BenchmarkRunResponse

router = APIRouter(prefix="/companies", tags=["benchmark"])


def _get_user_company_or_404(db: Session, company_id: int, user_id: int) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.owner_id == user_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company


@router.post("/{company_id}/benchmark", response_model=BenchmarkRunResponse)
async def run_benchmark(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BenchmarkRunResponse:
    _get_user_company_or_404(db, company_id, current_user.id)
    benchmark_data = await run_full_benchmark(company_id=company_id, db=db)

    summary = benchmark_data["summary"]
    record = BenchmarkResult(
        company_id=company_id,
        agent_score=float(summary["agent_average"]),
        default_score=float(summary["plain_average"]),
        comparison_data=benchmark_data,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return BenchmarkRunResponse(
        benchmark_id=record.id,
        company_id=company_id,
        agent_score=record.agent_score,
        default_score=record.default_score,
        comparison_data=record.comparison_data,
        created_at=record.created_at,
    )


@router.get("/{company_id}/benchmark", response_model=BenchmarkResultResponse)
def get_latest_benchmark(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BenchmarkResultResponse:
    _get_user_company_or_404(db, company_id, current_user.id)
    latest = (
        db.query(BenchmarkResult)
        .filter(BenchmarkResult.company_id == company_id)
        .order_by(BenchmarkResult.created_at.desc())
        .first()
    )
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No benchmark result found for this company.",
        )
    return BenchmarkResultResponse.model_validate(latest)
