from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.models import Assessment
from backend.app.db.session import get_db
from backend.app.schemas.risk import ReviewActionIn
from backend.app.services.assess import apply_review

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/queue")
def queue(db: Session = Depends(get_db)):
    from sqlalchemy import or_

    rows = (
        db.query(Assessment)
        .filter(Assessment.decision.in_(["REVIEW", "BLOCK"]))
        .filter(
            or_(Assessment.review_status.in_(["pending", "none"]), Assessment.review_status.is_(None)),
            ((~Assessment.review_status.in_(["approved", "rejected", "reviewed"])) | Assessment.review_status.is_(None)),
        )
        .order_by(Assessment.created_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "transaction_id": r.transaction_id,
                "amount": r.amount,
                "risk_probability": r.risk_probability,
                "risk_level": r.risk_level,
                "decision": r.decision,
                "review_status": r.review_status,
                "top_reason": (r.top_factors or [{}])[0].get("phrase") if r.top_factors else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/decisions")
@router.post("/{transaction_id}/action")
def action(body: ReviewActionIn, transaction_id: str | None = None, db: Session = Depends(get_db)):
    tx_id = transaction_id
    if not tx_id:
        raise HTTPException(status_code=400, detail="transaction_id is required")
    try:
        row = apply_review(db, tx_id, body.action, body.actor, body.note)
    except KeyError:
        raise HTTPException(status_code=404, detail="transaction not found") from None
    return {
        "transaction_id": row.transaction_id,
        "review_status": row.review_status,
        "decision": row.decision,
    }
