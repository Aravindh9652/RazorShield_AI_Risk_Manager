from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.models import ModelRegistry, PolicyConfig
from backend.app.db.session import get_db
from backend.app.services.registry import load_metrics_file, try_load_model

router = APIRouter(prefix="/model", tags=["model"])


@router.get("")
def model_info(db: Session = Depends(get_db)):
    bundle = try_load_model()
    row = db.query(ModelRegistry).filter(ModelRegistry.is_active.is_(True)).one_or_none()
    policy = db.query(PolicyConfig).filter(PolicyConfig.is_active.is_(True)).one_or_none()
    metrics = load_metrics_file()
    if row is None:
        raise HTTPException(status_code=404, detail="no active model in registry")
    return {
        "name": "RazorShield risk classifier",
        "version": row.version,
        "loaded": bundle is not None,
        "trained_at": row.trained_at.isoformat() if row.trained_at else None,
        "dataset_version": row.dataset_version,
        "feature_list": row.feature_list,
        "metrics": row.metrics,
        "notes": row.notes,
        "policy": {
            "version": policy.version if policy else None,
            "t1": policy.threshold_low if policy else None,
            "t2": policy.threshold_high if policy else None,
            "high_risk_action": policy.high_risk_action if policy else None,
            "block_amount_min": policy.block_amount_min if policy else None,
            "cost_assumptions": policy.cost_assumptions if policy else None,
        },
        "comparison": metrics.get("models_compared"),
        "selection_rule": metrics.get("selection_rule"),
        "split": metrics.get("split"),
    }
