"""Threshold search on validation data using the illustrative cost model."""

from __future__ import annotations

from typing import Any

import numpy as np

from ml.cost_model import expected_cost


def sweep_thresholds(
    y_true: np.ndarray,
    proba: np.ndarray,
    amounts: np.ndarray,
    cost: dict[str, Any] | None = None,
    high_risk_action: str = "BLOCK",
    block_amount_min: float = 25000,
) -> dict[str, Any]:
    t1_grid = np.round(np.linspace(0.08, 0.45, 12), 3)
    t2_grid = np.round(np.linspace(0.40, 0.90, 14), 3)
    rows = []
    best = None
    for t1 in t1_grid:
        for t2 in t2_grid:
            if t2 <= t1 + 0.05:
                continue
            metrics = expected_cost(
                y_true, proba, amounts, float(t1), float(t2), cost, high_risk_action, block_amount_min
            )
            rec = {"t1": float(t1), "t2": float(t2), **metrics}
            rows.append(rec)
            if best is None or rec["total_estimated_decision_cost"] < best["total_estimated_decision_cost"]:
                best = rec
    assert best is not None
    # Also record a naive 0.5/0.8 policy for comparison
    naive = expected_cost(y_true, proba, amounts, 0.5, 0.8, cost, high_risk_action, block_amount_min)
    return {
        "selected": best,
        "naive_0_5": {"t1": 0.5, "t2": 0.8, **naive},
        "curve": rows,
        "disclaimer": "illustrative synthetic cost assumptions",
    }
