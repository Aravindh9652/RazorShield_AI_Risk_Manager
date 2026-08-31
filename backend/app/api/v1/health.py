from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.risk import HealthOut
from backend.app.services.registry import try_load_model

router = APIRouter()


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unavailable"
    bundle = try_load_model()
    model_status = "ok" if bundle else "unavailable"
    overall = "ok" if db_status == "ok" else "degraded"
    if model_status != "ok":
        overall = "degraded"
    return HealthOut(
        status=overall,
        db=db_status,
        model=model_status,
        model_version=bundle.version if bundle else None,
        time=datetime.now(timezone.utc),
    )
