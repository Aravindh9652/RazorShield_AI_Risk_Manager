from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.db.models import AuditEvent
from backend.app.db.session import get_db

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
@router.get("/")
@router.get("/logs")
def list_audit(
    db: Session = Depends(get_db),
    transaction_id: str | None = None,
    decision: str | None = None,
    risk_level: str | None = None,
    model_version: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(100, le=500),
):
    q = db.query(AuditEvent).order_by(AuditEvent.created_at.desc())
    if transaction_id:
        q = q.filter(AuditEvent.transaction_id == transaction_id)
    if model_version:
        q = q.filter(AuditEvent.model_version == model_version)
    if date_from:
        q = q.filter(AuditEvent.created_at >= date_from)
    if date_to:
        q = q.filter(AuditEvent.created_at <= date_to)
    rows = q.limit(limit).all()
    items = []
    for r in rows:
        payload = r.payload or {}
        if risk_level and payload.get("risk_level") != risk_level:
            continue
        if decision and payload.get("decision") != decision:
            continue
        items.append(
            {
                "id": str(r.id),
                "assessment_id": str(r.assessment_id) if r.assessment_id else None,
                "transaction_id": r.transaction_id,
                "event_type": r.event_type,
                "payload": payload,
                "model_version": r.model_version,
                "policy_version": r.policy_version,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
        )
    return {"items": items}
