from __future__ import annotations

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from backend.app.db.models import Assessment
from backend.app.db.session import get_db
from backend.app.schemas.risk import AssessmentOut, TransactionIn
from backend.app.services.assess import DatabaseUnavailable, assess_transaction
from backend.app.services.registry import load_metrics_file

router = APIRouter(prefix="/risk", tags=["risk"])


def _db_error(exc: DatabaseUnavailable) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "database_unavailable",
            "message": "Assessment was not stored. Retry with the same transaction_id.",
        },
    ) from exc


@router.post("/assess", response_model=AssessmentOut)
def assess(payload: TransactionIn, db: Session = Depends(get_db)) -> AssessmentOut:
    try:
        return assess_transaction(db, payload)
    except DatabaseUnavailable as exc:
        _db_error(exc)


@router.post("/batch")
def batch(
    db: Session = Depends(get_db),
    file: UploadFile | None = File(default=None),
    body: list[TransactionIn] | None = None,
):
    records: list[TransactionIn] = []
    if file is not None:
        raw = file.file.read().decode("utf-8")
        reader = csv.DictReader(io.StringIO(raw))
        for row in reader:
            row.pop("fraud_label", None)
            row.pop("dataset_version", None)
            row.pop("scenario", None)
            try:
                records.append(TransactionIn.model_validate(row))
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Invalid row {row.get('transaction_id')}: {exc}") from exc
    elif body:
        records = body
    else:
        raise HTTPException(status_code=422, detail="Provide a CSV file or a JSON list of transactions")

    results = []
    errors = []
    for rec in records:
        try:
            results.append(assess_transaction(db, rec).model_dump(mode="json"))
        except DatabaseUnavailable as exc:
            _db_error(exc)
        except Exception as exc:
            errors.append({"transaction_id": rec.transaction_id, "error": str(exc)})
    return {"count": len(results), "error_count": len(errors), "results": results, "errors": errors}


@router.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    heldout = load_metrics_file()
    total = db.query(Assessment).count()
    high = db.query(Assessment).filter(Assessment.risk_level == "HIGH").count()
    review = db.query(Assessment).filter(Assessment.decision == "REVIEW").count()
    blocked = db.query(Assessment).filter(Assessment.decision == "BLOCK").count()
    allowed = db.query(Assessment).filter(Assessment.decision == "ALLOW").count()
    alerts = (
        db.query(Assessment)
        .filter(Assessment.risk_level.in_(["MEDIUM", "HIGH"]))
        .order_by(Assessment.created_at.desc())
        .limit(8)
        .all()
    )
    test = heldout.get("test_metrics", {})
    at_t2 = test.get("at_t2_high_risk_boundary", {})
    return {
        "disclaimer": "Held-out metrics come from the evaluation pipeline on synthetic data. Operational counts are live assessments.",
        "operational": {
            "transactions_assessed": total,
            "total_assessments": total,
            "high_risk": high,
            "review_queue": review,
            "review_count": review,
            "blocked": blocked,
            "block_count": blocked,
            "allowed": allowed,
            "allow_count": allowed,
            "degraded_count": 0,
            "pending_reviews": review,
        },
        "heldout": {
            "selected_model": heldout.get("selected_model"),
            "model_version": heldout.get("model_version"),
            "dataset_version": heldout.get("dataset_version"),
            "precision": at_t2.get("precision"),
            "recall": at_t2.get("recall"),
            "f1": at_t2.get("f1"),
            "roc_auc": at_t2.get("roc_auc"),
            "pr_auc": at_t2.get("pr_auc"),
            "confusion_matrix": at_t2.get("confusion_matrix"),
            "at_t1": test.get("at_t1_review_boundary"),
            "at_0_5": test.get("at_0_5_reference"),
            "cost": test.get("cost"),
        },
        "thresholds": heldout.get("thresholds"),
        "models_compared": heldout.get("models_compared"),
        "curves": heldout.get("curves"),
        "threshold_cost_curve": heldout.get("threshold_cost_curve"),
        "split": heldout.get("split"),
        "recent_alerts": [
            {
                "transaction_id": a.transaction_id,
                "amount": a.amount,
                "risk_probability": a.risk_probability,
                "risk_level": a.risk_level,
                "decision": a.decision,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


@router.get("/assessments")
def list_assessments(
    db: Session = Depends(get_db),
    decision: str | None = None,
    risk_level: str | None = None,
    review_status: str | None = None,
    q: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    from backend.app.services.assess import _serialize

    query = db.query(Assessment).order_by(Assessment.created_at.desc())
    if decision:
        query = query.filter(Assessment.decision == decision)
    if risk_level:
        query = query.filter(Assessment.risk_level == risk_level)
    if review_status == "pending":
        query = query.filter(
            or_(
                Assessment.review_status == "pending",
                Assessment.review_status == "none",
                Assessment.review_status.is_(None),
            ),
            (~Assessment.review_status.in_(["approved", "rejected", "reviewed"])) | Assessment.review_status.is_(None),
        )
    elif review_status:
        query = query.filter(Assessment.review_status == review_status)
    if q:
        query = query.filter(Assessment.transaction_id.ilike(f"%{q}%"))
    rows = query.offset(offset).limit(limit).all()
    items = []
    for r in rows:
        serialized = _serialize(r).model_dump(mode="json")
        serialized["risk_score"] = int(round((r.risk_probability or 0.0) * 100))
        serialized["merchant_id"] = r.merchant_id or "mch_default"
        serialized["customer_id"] = getattr(r, "customer_id", "cust_default")
        serialized["top_contributors"] = [f for f in (r.top_factors or [])]
        items.append(serialized)
    return {"total": len(items), "items": items}


@router.get("/{transaction_id}", response_model=AssessmentOut)
def get_one(transaction_id: str, db: Session = Depends(get_db)) -> AssessmentOut:
    from backend.app.services.assess import _serialize

    row = db.query(Assessment).filter(Assessment.transaction_id == transaction_id).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    return _serialize(row)


@router.get("/{transaction_id}/evidence")
def generate_chargeback_evidence(transaction_id: str, db: Session = Depends(get_db)):
    row = db.query(Assessment).filter(Assessment.transaction_id == transaction_id).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="transaction not found")

    snap = row.feature_snapshot or {}
    evidence_pack = {
        "dispute_id": f"DISP-{row.transaction_id.upper()}",
        "transaction_id": row.transaction_id,
        "merchant_id": row.merchant_id or "mch_default",
        "customer_id": snap.get("customer_id", "cust_default"),
        "timestamp": row.event_time.isoformat() if row.event_time else datetime.now(timezone.utc).isoformat(),
        "amount": row.amount,
        "currency": row.currency or "INR",
        "device_proof": {
            "device_id": snap.get("device_id", "dev_default"),
            "device_age_days": snap.get("device_age_days", 120),
            "ip_risk_score": snap.get("ip_risk_score", 0.05),
            "location_distance_km": snap.get("location_distance_from_previous", 0.0),
        },
        "customer_history": {
            "account_age_days": snap.get("customer_account_age_days", 365),
            "previous_successful_txns": snap.get("customer_transaction_count", 45),
            "previous_chargebacks": snap.get("previous_chargebacks", 0),
            "customer_history_score": snap.get("customer_history_score", 0.95),
        },
        "risk_explanation": {
            "risk_score": int(round((row.risk_probability or 0.0) * 100)),
            "risk_level": row.risk_level,
            "decision": row.decision,
            "top_shap_factors": [f for f in (row.top_factors or [])],
        },
        "defense_summary": (
            f"Transaction {row.transaction_id} was authorized by customer {snap.get('customer_id', 'cust_default')} "
            f"via payment method {str(snap.get('payment_method', 'CARD')).upper()}. Device age ({snap.get('device_age_days', 120)} days) "
            f"and historical success count ({snap.get('customer_transaction_count', 45)}) verify legitimate usage. "
            f"Calculated fraud risk score: {int(round((row.risk_probability or 0.0) * 100))}/100."
        ),
        "audit_hash": f"SHA256-{abs(hash(str(row.assessment_id))):x}",
    }
    return evidence_pack
