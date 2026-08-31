from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from backend.app.config import get_settings
from backend.app.db.models import ModelRegistry, PolicyConfig
from ml.constants import DEFAULT_COST, FEATURE_COLUMNS, MODEL_VERSION
from ml.serve import ModelBundle, load_bundle

logger = logging.getLogger("razorshield")

_bundle: ModelBundle | None = None
_bundle_error: str | None = None


def try_load_model() -> ModelBundle | None:
    global _bundle, _bundle_error
    if _bundle is not None:
        return _bundle
    settings = get_settings()
    try:
        _bundle = load_bundle(Path(settings.model_dir), settings.active_model_version)
        _bundle_error = None
        return _bundle
    except Exception as exc:
        _bundle_error = str(exc)
        logger.warning(json.dumps({"event": "model_load_failed", "error": str(exc)}))
        return None


def model_error() -> str | None:
    return _bundle_error


def load_metrics_file() -> dict[str, Any]:
    settings = get_settings()
    path = Path(settings.artifacts_dir) / "test_metrics.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def bootstrap_registry(db: Session) -> None:
    settings = get_settings()
    bundle = try_load_model()
    metrics = load_metrics_file()
    version = settings.active_model_version
    existing = db.query(ModelRegistry).filter(ModelRegistry.version == version).one_or_none()
    payload = {
        "version": version,
        "trained_at": None,
        "dataset_version": metrics.get("dataset_version", "unknown"),
        "feature_list": {"columns": FEATURE_COLUMNS, "transformed": metrics.get("feature_names_out", [])},
        "metrics": metrics.get("test_metrics", {}),
        "artifact_path": f"{version}.joblib",
        "is_active": True,
        "notes": f"selected={metrics.get('selected_model')}",
    }
    if metrics.get("trained_at"):
        try:
            payload["trained_at"] = datetime.fromisoformat(metrics["trained_at"].replace("Z", "+00:00"))
        except ValueError:
            payload["trained_at"] = datetime.now(timezone.utc)
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
    else:
        db.add(ModelRegistry(**payload))

    t1 = 0.25
    t2 = 0.65
    if bundle:
        t1, t2 = bundle.t1, bundle.t2
    elif metrics.get("thresholds"):
        t1 = metrics["thresholds"]["t1"]
        t2 = metrics["thresholds"]["t2"]

    pol = db.query(PolicyConfig).filter(PolicyConfig.version == settings.policy_version).one_or_none()
    pol_payload = {
        "version": settings.policy_version,
        "threshold_low": t1,
        "threshold_high": t2,
        "high_risk_action": settings.high_risk_action,
        "block_amount_min": settings.block_amount_min,
        "cost_assumptions": {
            **DEFAULT_COST,
            "fraud_loss_multiplier": settings.cost_fraud_loss_multiplier,
            "review_cost": settings.cost_review,
            "customer_friction_cost": settings.cost_customer_friction,
            "blocked_legitimate_cost": settings.cost_blocked_legitimate,
        },
        "is_active": True,
    }
    if pol:
        for k, v in pol_payload.items():
            setattr(pol, k, v)
    else:
        db.add(PolicyConfig(**pol_payload))
    db.commit()
