from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db.models import Assessment, AuditEvent, ReviewAction
from backend.app.logging import log_event
from backend.app.policy.engine import apply_policy, confidence_from_probability
from backend.app.schemas.risk import AssessmentOut, FactorOut, TransactionIn
from backend.app.services.registry import model_error, try_load_model
from ml.features import feature_hash, snapshot_features

logger = logging.getLogger("razorshield")


class DatabaseUnavailable(Exception):
    pass


def _serialize(row: Assessment, duplicate: bool = False, audit_id: str | None = None) -> AssessmentOut:
    settings = get_settings()
    bundle = try_load_model()
    t1 = bundle.t1 if bundle else 0.25
    t2 = bundle.t2 if bundle else 0.65
    snap = row.feature_snapshot or {}
    pm = snap.get("payment_method") or "UPI"
    mc = snap.get("merchant_category") or "Ecommerce"
    cid = snap.get("customer_id") or "cust_default"
    did = snap.get("device_id") or "dev_default"
    return AssessmentOut(
        assessment_id=str(row.assessment_id),
        transaction_id=row.transaction_id,
        merchant_id=row.merchant_id or snap.get("merchant_id") or "mch_default",
        customer_id=cid,
        device_id=did,
        payment_method=str(pm).upper(),
        merchant_category=str(mc).capitalize(),
        timestamp=row.event_time,
        amount=row.amount,
        currency=row.currency,
        risk_probability=row.risk_probability,
        risk_level=row.risk_level,
        decision=row.decision,
        model_confidence=row.model_confidence,
        recommended_action=row.decision,
        thresholds={"t1": t1, "t2": t2},
        model_version=row.model_version,
        policy_version=row.policy_version,
        top_factors=[FactorOut(**f) for f in (row.top_factors or [])],
        explanation_status=row.explanation_status,
        degraded=row.degraded,
        degraded_reason=row.degraded_reason,
        processing_status=row.processing_status,
        duplicate=duplicate,
        audit_id=audit_id,
        review_status=row.review_status,
    )


def _audit(db: Session, *, assessment_id, transaction_id, event_type, payload, model_version, policy_version) -> AuditEvent:
    ev = AuditEvent(
        assessment_id=assessment_id,
        transaction_id=transaction_id,
        event_type=event_type,
        payload=payload,
        model_version=model_version,
        policy_version=policy_version,
    )
    db.add(ev)
    db.flush()
    return ev


def assess_transaction(db: Session, payload: TransactionIn) -> AssessmentOut:
    settings = get_settings()
    try:
        existing = db.query(Assessment).filter(Assessment.transaction_id == payload.transaction_id).one_or_none()
    except (OperationalError, SQLAlchemyError) as exc:
        raise DatabaseUnavailable(str(exc)) from exc

    if existing:
        ev = _audit(
            db,
            assessment_id=existing.assessment_id,
            transaction_id=payload.transaction_id,
            event_type="DUPLICATE_HIT",
            payload={"assessment_id": str(existing.assessment_id)},
            model_version=existing.model_version,
            policy_version=existing.policy_version,
        )
        db.commit()
        log_event(logger, event="duplicate_assessment", transaction_id=payload.transaction_id)
        return _serialize(existing, duplicate=True, audit_id=str(ev.id))

    data = payload.model_dump()
    if "customer_avg_amount" not in data and "avg_customer_amount" in data:
        data["customer_avg_amount"] = data["avg_customer_amount"]
    if "customer_transaction_count" not in data and "previous_transaction_count" in data:
        data["customer_transaction_count"] = data["previous_transaction_count"]
    ts = payload.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    if data.get("transaction_hour") is None:
        data["transaction_hour"] = ts.hour
    if data.get("is_weekend") is None:
        data["is_weekend"] = 1 if ts.weekday() >= 5 else 0

    bundle = try_load_model()
    degraded = False
    degraded_reason = None
    factors: list[dict] = []
    explanation_status = "skipped"
    probability: float | None = None
    model_version = settings.active_model_version

    if bundle is None:
        degraded = True
        degraded_reason = "model_unavailable"
        risk_lvl, decision, recommended = "MEDIUM", "REVIEW", "REVIEW"
        t1, t2 = 0.25, 0.65
        confidence = None
        log_event(logger, event="degraded_review", reason=degraded_reason, error=model_error())
    else:
        model_version = bundle.version
        t1, t2 = bundle.t1, bundle.t2
        probability = bundle.predict_proba_one(data)
        risk_lvl, decision, recommended = apply_policy(probability, payload.amount, t1, t2)
        confidence = confidence_from_probability(probability, t1, t2)
        try:
            from ml.explain import shap_top_factors
            from ml.features import to_model_frame

            factors = shap_top_factors(bundle.pipeline, to_model_frame([data]))
            explanation_status = "ok"
        except Exception as exc:
            explanation_status = "failed"
            log_event(logger, event="explanation_failed", error=str(exc), transaction_id=payload.transaction_id)

    row = Assessment(
        assessment_id=uuid.uuid4(),
        transaction_id=payload.transaction_id,
        merchant_id=payload.merchant_id,
        amount=payload.amount,
        currency=payload.currency,
        event_time=ts,
        risk_probability=probability,
        risk_level=risk_lvl,
        decision=decision,
        model_confidence=confidence,
        model_version=model_version,
        policy_version=settings.policy_version,
        top_factors=factors,
        explanation_status=explanation_status,
        feature_hash=feature_hash(data),
        feature_snapshot=snapshot_features(data),
        degraded=degraded,
        degraded_reason=degraded_reason,
        processing_status="completed",
        review_status="pending" if decision in ("REVIEW", "BLOCK") else "none",
    )
    try:
        db.add(row)
        db.flush()
        ev = _audit(
            db,
            assessment_id=row.assessment_id,
            transaction_id=row.transaction_id,
            event_type="ASSESSMENT",
            payload={
                "decision": decision,
                "risk_probability": probability,
                "risk_level": risk_lvl,
                "degraded": degraded,
                "explanation_status": explanation_status,
            },
            model_version=model_version,
            policy_version=settings.policy_version,
        )
        if explanation_status == "failed":
            _audit(
                db,
                assessment_id=row.assessment_id,
                transaction_id=row.transaction_id,
                event_type="EXPLANATION_FAILED",
                payload={"kept_decision": True},
                model_version=model_version,
                policy_version=settings.policy_version,
            )
        if degraded:
            _audit(
                db,
                assessment_id=row.assessment_id,
                transaction_id=row.transaction_id,
                event_type="MODEL_DEGRADED",
                payload={"reason": degraded_reason},
                model_version=model_version,
                policy_version=settings.policy_version,
            )
        db.commit()
        db.refresh(row)
    except IntegrityError:
        db.rollback()
        existing = db.query(Assessment).filter(Assessment.transaction_id == payload.transaction_id).one()
        return _serialize(existing, duplicate=True)
    except (OperationalError, SQLAlchemyError) as exc:
        db.rollback()
        raise DatabaseUnavailable(str(exc)) from exc

    log_event(
        logger,
        event="assessment_completed",
        transaction_id=row.transaction_id,
        decision=decision,
        risk_probability=probability,
        degraded=degraded,
    )
    return _serialize(row, audit_id=str(ev.id))


def apply_review(db: Session, transaction_id: str, action: str, actor: str, note: str | None) -> Assessment:
    row = db.query(Assessment).filter(Assessment.transaction_id == transaction_id).one_or_none()
    if row is None:
        raise KeyError(transaction_id)
    row.review_status = {
        "mark_reviewed": "reviewed",
        "approve": "approved",
        "reject": "rejected",
    }[action]
    db.add(ReviewAction(assessment_id=row.assessment_id, action=action, actor=actor, note=note))
    _audit(
        db,
        assessment_id=row.assessment_id,
        transaction_id=row.transaction_id,
        event_type=f"REVIEW_{action.upper()}",
        payload={"actor": actor, "note": note},
        model_version=row.model_version,
        policy_version=row.policy_version,
    )
    db.commit()
    db.refresh(row)
    return row
