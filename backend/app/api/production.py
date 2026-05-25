from io import StringIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.production import ProductionData
from app.models.user import User
from app.schemas.production import ColumnMappingReportItem, ProductionDataResponse, UploadResponse
from app.services.csv_column_mapping import REQUIRED_FIELDS, map_production_columns_async

router = APIRouter(prefix="/companies", tags=["production-data"])

MAX_CSV_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_CSV_UPLOAD_ROWS = 50_000


def _get_user_company_or_404(db: Session, company_id: int, user_id: int) -> Company:
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.owner_id == user_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found.")
    return company


def _parse_csv_upload(csv_file: UploadFile) -> pd.DataFrame:
    if not csv_file.filename or not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are supported.")
    try:
        csv_bytes = csv_file.file.read(MAX_CSV_UPLOAD_BYTES + 1)
        if len(csv_bytes) > MAX_CSV_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="CSV file is too large. Maximum size is 10 MB.",
            )
        decoded_content = csv_bytes.decode("utf-8-sig")
        dataframe = pd.read_csv(StringIO(decoded_content))
        if len(dataframe.index) > MAX_CSV_UPLOAD_ROWS:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="CSV file has too many rows. Maximum is 50000 rows.",
            )
    except HTTPException:
        raise
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV encoding is invalid. Please use UTF-8.",
        ) from exc
    except pd.errors.EmptyDataError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV file is empty.") from exc
    except pd.errors.ParserError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV format is invalid.") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to process uploaded CSV file.",
        ) from exc
    finally:
        csv_file.file.close()
    return dataframe


@router.post("/{company_id}/upload", response_model=UploadResponse)
async def upload_production_data(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UploadResponse:
    _get_user_company_or_404(db, company_id, current_user.id)
    dataframe = _parse_csv_upload(file)

    if dataframe.empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV has no rows to upload.")

    mapped = await map_production_columns_async(dataframe)
    dataframe = mapped.dataframe
    records_to_insert: list[ProductionData] = []
    for index, row in dataframe.iterrows():
        try:
            product_name = str(row["product_name"]).strip()
            if not product_name:
                raise ValueError("product_name is empty.")
            record = ProductionData(
                company_id=company_id,
                product_name=product_name,
                daily_capacity=int(row["daily_capacity"]),
                current_demand=int(row["current_demand"]),
                stock_level=int(row["stock_level"]),
                lead_time_days=int(row["lead_time_days"]),
            )
            records_to_insert.append(record)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid data at row {index + 2}: {exc}",
            ) from exc

    db.add_all(records_to_insert)
    db.commit()

    unique_products = sorted({record.product_name for record in records_to_insert})
    mapping_report = [
        ColumnMappingReportItem(
            source_column=entry.source_column,
            target_field=entry.target_field,
            confidence=entry.confidence,
        )
        for entry in mapped.mapping_report
    ]
    return UploadResponse(
        company_id=company_id,
        rows_uploaded=len(records_to_insert),
        columns_validated=list(REQUIRED_FIELDS),
        products=unique_products,
        mapping_report=mapping_report,
        unmapped_source_columns=mapped.unmapped_source_columns,
        ai_mapping_used=mapped.ai_mapping_used,
    )


@router.get("/{company_id}/data", response_model=list[ProductionDataResponse])
def get_production_data(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProductionDataResponse]:
    _get_user_company_or_404(db, company_id, current_user.id)
    rows = (
        db.query(ProductionData)
        .filter(ProductionData.company_id == company_id)
        .order_by(ProductionData.uploaded_at.desc(), ProductionData.id.desc())
        .all()
    )
    return [ProductionDataResponse.model_validate(row) for row in rows]


@router.delete("/{company_id}/data", status_code=status.HTTP_204_NO_CONTENT)
def clear_production_data(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    _get_user_company_or_404(db, company_id, current_user.id)
    db.query(ProductionData).filter(ProductionData.company_id == company_id).delete(
        synchronize_session=False
    )
    db.commit()
