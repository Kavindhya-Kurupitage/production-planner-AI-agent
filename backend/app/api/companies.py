from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


def _get_user_company_or_404(db: Session, company_id: int, user_id: int) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.owner_id == user_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    company = Company(
        name=payload.name,
        industry=payload.industry,
        main_constraint=payload.main_constraint,
        priority_metric=payload.priority_metric,
        owner_id=current_user.id,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CompanyResponse]:
    companies = (
        db.query(Company)
        .filter(Company.owner_id == current_user.id)
        .order_by(Company.created_at.desc())
        .all()
    )
    return [CompanyResponse.model_validate(company) for company in companies]


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    company = _get_user_company_or_404(db, company_id, current_user.id)
    return CompanyResponse.model_validate(company)


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    company = _get_user_company_or_404(db, company_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(company, field_name, value)
    db.commit()
    db.refresh(company)
    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    company = _get_user_company_or_404(db, company_id, current_user.id)
    db.delete(company)
    db.commit()
