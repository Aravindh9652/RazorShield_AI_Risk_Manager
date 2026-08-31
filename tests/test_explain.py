"""
Tests for SHAP feature explainability.
"""

from ml.data_generation import generate_synthetic_transactions
from ml.train import train_and_select
from ml.features import select_feature_frame
from ml.explain import compute_global_shap_importance, shap_top_factors


def test_shap_explanations():
    df = generate_synthetic_transactions(n_customers=30, n_merchants=5, n_transactions=400, seed=55)
    res = train_and_select(df)
    pipeline = res["pipeline"]
    X_val = select_feature_frame(res["frames"]["val"])

    # Global importance
    global_imp = compute_global_shap_importance(pipeline, X_val.iloc[:50])
    assert isinstance(global_imp, list)
    assert len(global_imp) > 0
    assert "mean_abs_shap" in global_imp[0]

    # Individual local factors ("Top model contributors")
    local_factors = shap_top_factors(pipeline, X_val.iloc[[0]], top_k=5)
    assert isinstance(local_factors, list)
    assert len(local_factors) == 5
    assert "direction" in local_factors[0]
    assert local_factors[0]["direction"] in ("increases_risk", "decreases_risk")
