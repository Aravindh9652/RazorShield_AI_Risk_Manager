"""
Tests for decision thresholds and business decision cost model.
"""

import numpy as np
from ml.cost_model import decision_from_proba, expected_cost
from ml.thresholds import sweep_thresholds


def test_decision_boundaries():
    t1 = 0.35
    t2 = 0.70

    assert decision_from_proba(0.10, t1, t2, 5000) == "ALLOW"
    assert decision_from_proba(0.50, t1, t2, 5000) == "REVIEW"
    assert decision_from_proba(0.85, t1, t2, 30000, high_risk_action="BLOCK", block_amount_min=25000) == "BLOCK"
    # High risk below min block amount falls back to REVIEW (Degraded / Review decision)
    assert decision_from_proba(0.85, t1, t2, 10000, high_risk_action="BLOCK", block_amount_min=25000) == "REVIEW"


def test_cost_calculation():
    y_true = np.array([0, 1, 0, 1])
    probas = np.array([0.10, 0.90, 0.50, 0.20])
    amounts = np.array([1000.0, 50000.0, 2000.0, 15000.0])

    t1 = 0.30
    t2 = 0.70

    costs = expected_cost(y_true, probas, amounts, t1, t2)

    assert "total_estimated_decision_cost" in costs
    assert costs["false_negative_count"] == 1.0  # 4th txn is fraud but allowed (p=0.20 < t1=0.30)
    assert costs["estimated_false_negative_cost"] == 15000.0


def test_threshold_sweep():
    y_true = np.array([0, 0, 1, 1, 0, 1])
    probas = np.array([0.05, 0.15, 0.85, 0.92, 0.40, 0.65])
    amounts = np.array([1000.0, 2000.0, 40000.0, 50000.0, 1500.0, 30000.0])

    res = sweep_thresholds(y_true, probas, amounts)

    assert "selected" in res
    assert "t1" in res["selected"]
    assert "t2" in res["selected"]
    assert res["selected"]["t2"] > res["selected"]["t1"]
