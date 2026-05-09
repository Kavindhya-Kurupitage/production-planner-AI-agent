from fastapi import FastAPI
from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.benchmark import router as benchmark_router
from app.api.companies import router as companies_router
from app.api.production import router as production_router
from app.api.routes import router as planner_router
from app.api.scenarios import router as scenarios_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import GroqAPIError, NotFoundError, UnauthorizedError, ValidationError
from app.models import Base

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.exception_handler(NotFoundError)
async def not_found_exception_handler(_: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"error": "not_found", "message": exc.message, "details": exc.details},
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_exception_handler(_: Request, exc: UnauthorizedError) -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"error": "unauthorized", "message": exc.message, "details": exc.details},
    )


@app.exception_handler(ValidationError)
async def validation_exception_handler(_: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "validation_error", "message": exc.message, "details": exc.details},
    )


@app.exception_handler(GroqAPIError)
async def groq_exception_handler(_: Request, exc: GroqAPIError) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"error": "groq_api_error", "message": exc.message, "details": exc.details},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "http_error", "message": str(exc.detail), "details": {}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "message": "Unexpected server error.", "details": {}},
    )


@app.get("/health")
def health_check():
    database_status = "disconnected"
    groq_status = "unreachable"

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        database_status = "disconnected"

    try:
        if settings.groq_api_key:
            response = httpx.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                timeout=8.0,
            )
            groq_status = "reachable" if response.status_code == 200 else "unreachable"
        else:
            groq_status = "unreachable"
    except Exception:
        groq_status = "unreachable"

    return {"status": "ok", "database": database_status, "groq": groq_status}


app.include_router(planner_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(companies_router, prefix=settings.api_prefix)
app.include_router(production_router, prefix=settings.api_prefix)
app.include_router(scenarios_router, prefix=settings.api_prefix)
app.include_router(benchmark_router, prefix=settings.api_prefix)
