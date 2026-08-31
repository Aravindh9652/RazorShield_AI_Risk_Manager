"""Illustrative synthetic cost model for threshold selection. Not real-world P&L."""

from __future__ import annotations

from typing import Any

import numpy as np

from ml.constants import DEFAULT_COST


def decision_from_proba(
    p: float,
    t1: float,
    t2: float,
    amount: float,
    high_risk_action: str = "BLOCK",
    block_amount_min: float = 25000,
) -> str:
    if p < t1:
        return "ALLOW"
    if p < t2:
        return "REVIEW"
    if high_risk_action == "BLOCK" and amount >= block_amount_min:
        return "BLOCK"
    return "REVIEW"


def risk_level(p: float, t1: float, t2: float) -> str:
    if p < t1:
        return "LOW"
    if p < t2:
        return "MEDIUM"
    return "HIGH"


def expected_cost(
    y_true: np.ndarray,
    proba: np.ndarray,
    amounts: np.ndarray,
    t1: float,
    t2: float,
    cost: dict[str, Any] | None = None,
    high_risk_action: str = "BLOCK",
    block_amount_min: float = 25000,
) -> dict[str, float]:
    """
    Cost assumptions (illustrative synthetic cost assumptions):
    - ALLOW + fraud: lost amount * fraud_loss_multiplier  (false negative)
    - BLOCK + legitimate: blocked_legitimate_cost + customer_friction_cost
    - REVIEW: review_cost; if legitimate, also customer_friction_cost
    - BLOCK + fraud: 0 loss (prevented); no review cost
    - ALLOW + legit: 0
    """
    cfg = {**DEFAULT_COST, **(cost or {})}
    fn_count = fp_block = fp_review = 0
    total = 0.0
    fn_cost = fp_cost = 0.0
    for yt, p, amt in zip(y_true, proba, amounts):
        d = decision_from_proba(float(p), t1, t2, float(amt), high_risk_action, block_amount_min)
        if d == "ALLOW":
            if yt == 1:
                fn_count += 1
                loss = float(amt) * float(cfg["fraud_loss_multiplier"])
                fn_cost += loss
                total += loss
        elif d == "BLOCK":
            if yt == 0:
                fp_block += 1
                c = float(cfg["blocked_legitimate_cost"]) + float(cfg["customer_friction_cost"])
                fp_cost += c
                total += c
        else:  # REVIEW
            total += float(cfg["review_cost"])
            if yt == 0:
                fp_review += 1
                total += float(cfg["customer_friction_cost"])
                fp_cost += float(cfg["review_cost"]) + float(cfg["customer_friction_cost"])
            else:
                total += 0.0  # caught at review; review_cost already added
    n = max(len(y_true), 1)
    return {
        "false_negative_count": float(fn_count),
        "false_positive_block_count": float(fp_block),
        "false_positive_review_count": float(fp_review),
        "false_positive_count": float(fp_block + fp_review),
        "estimated_false_negative_cost": round(fn_cost, 2),
        "estimated_false_positive_cost": round(fp_cost, 2),
        "total_estimated_decision_cost": round(total, 2),
        "cost_per_transaction": round(total / n, 2),
    }
