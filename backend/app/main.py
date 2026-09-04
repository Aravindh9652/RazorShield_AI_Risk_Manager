from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from backend.app.api.v1 import audit, health, model, review, risk
from backend.app.config import get_settings
from backend.app.db.session import Base, SessionLocal, engine
from backend.app.logging import configure_logging, log_event
from backend.app.services.registry import bootstrap_registry, try_load_model

logger = logging.getLogger("razorshield")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    try_load_model()
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            bootstrap_registry(db)
        finally:
            db.close()
    except Exception as exc:
        logger.warning(f"Database initialization deferred at startup: {exc}")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="RazorShield API",
        description="Explainable AI merchant risk manager. Synthetic data for demonstration and evaluation.",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        return {
            "name": "RazorShield API",
            "subtitle": "Explainable AI Risk Manager for Merchants",
            "version": "1.0.0",
            "status": "online",
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    app.include_router(health.router, prefix="/api/v1")
    app.include_router(risk.router, prefix="/api/v1")
    app.include_router(audit.router, prefix="/api/v1")
    app.include_router(model.router, prefix="/api/v1")
    app.include_router(review.router, prefix="/api/v1")

    @app.middleware("http")
    async def request_log(request: Request, call_next):
        response = await call_next(request)
        log_event(
            logger,
            event="http_request",
            method=request.method,
            path=str(request.url.path),
            status=response.status_code,
        )
        return response

    @app.exception_handler(OperationalError)
    async def db_down(_request: Request, exc: OperationalError):
        return JSONResponse(
            status_code=503,
            content={"error": "database_unavailable", "message": "Database is temporarily unavailable. Retry the request."},
        )

    return app


app = create_app()
