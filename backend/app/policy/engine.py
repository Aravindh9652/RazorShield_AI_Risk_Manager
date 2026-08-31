from datetime import datetime

from backend.app.config import get_settings
from ml.cost_model import decision_from_proba, risk_level


def apply_policy(
    probability: float,
    amount: float,
    t1: float,
    t2: float,
) -> tuple[str, str, str]:
    settings = get_settings()
    level = risk_level(probability, t1, t2)
    decision = decision_from_proba(
        probability,
        t1,
        t2,
        amount,
        high_risk_action=settings.high_risk_action,
        block_amount_min=settings.block_amount_min,
    )
    return level, decision, decision


def confidence_from_probability(p: float, t1: float, t2: float) -> float:
    """
    Distance from the nearest decision boundary, scaled to [0, 1].
    This is not calibrated certainty; it is a simple operating-point confidence.
    """
    bounds = [t1, t2]
    dist = min(abs(p - b) for b in bounds)
    return float(max(0.0, min(1.0, dist / 0.5)))
