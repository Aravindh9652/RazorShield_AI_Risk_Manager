"""
SHAP contributions mapped to human-readable phrases.
Terms used: "Top model contributors" (does not make causal claims).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ml.constants import FEATURE_PHRASES


def compute_global_shap_importance(pipeline, sample_frame: pd.DataFrame) -> list[dict[str, Any]]:
    import shap

    prep = pipeline.named_steps["prep"]
    clf = pipeline.named_steps["clf"]
    transformed = prep.transform(sample_frame)
    names = list(prep.get_feature_names_out())

    try:
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(transformed)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        shap_values = np.asarray(shap_values)
        if shap_values.ndim == 3:
            shap_values = shap_values[:, :, 1] if shap_values.shape[2] == 2 else shap_values[:, 1, :]
    except Exception:
        if hasattr(clf, "coef_"):
            shap_values = transformed * clf.coef_.reshape(1, -1)
        else:
            raise

    mean_abs = np.mean(np.abs(shap_values), axis=0).ravel()
    n_feat = min(len(names), len(mean_abs))
    order = np.argsort(-mean_abs[:n_feat])

    results = []
    for idx in order:
        i = int(idx)
        raw_name = str(names[i])
        base_key = raw_name.split("__", 1)[-1]
        clean_key = base_key.split("_")[0] if "_" in base_key else base_key
        phrase = FEATURE_PHRASES.get(base_key, FEATURE_PHRASES.get(clean_key, base_key.replace("_", " ")))
        results.append({
            "feature_raw": raw_name,
            "feature": base_key,
            "phrase": phrase,
            "mean_abs_shap": float(mean_abs[i]),
        })
    return results


def shap_top_factors(pipeline, feature_frame: pd.DataFrame, top_k: int = 6) -> list[dict[str, Any]]:
    """
    Returns top model contributors for an individual transaction.
    Uses wording 'Top model contributors', no causal claims.
    """
    import shap

    prep = pipeline.named_steps["prep"]
    clf = pipeline.named_steps["clf"]
    transformed = prep.transform(feature_frame)
    names = list(prep.get_feature_names_out())

    try:
        explainer = shap.TreeExplainer(clf)
        shap_values = explainer.shap_values(transformed)
        if isinstance(shap_values, list):
            shap_values = shap_values[1]
        shap_values = np.asarray(shap_values)
        if shap_values.ndim == 3:
            row = shap_values[0, :, 1].ravel() if shap_values.shape[2] == 2 else shap_values[0, 1, :].ravel()
        else:
            row = shap_values[0].ravel()
    except Exception:
        if hasattr(clf, "coef_"):
            row = (clf.coef_.reshape(-1) * transformed[0]).ravel()
        else:
            raise

    n_feat = min(len(names), len(row))
    order = np.argsort(-np.abs(row[:n_feat]))
    factors = []
    for idx in order[:top_k]:
        i = int(idx)
        raw = str(names[i])
        base = raw.split("__", 1)[-1]
        clean_key = base.split("_")[0] if "_" in base else base
        phrase = FEATURE_PHRASES.get(base, FEATURE_PHRASES.get(clean_key, base.replace("_", " ")))
        factors.append({
            "feature": raw,
            "phrase": phrase,
            "contribution": float(row[i]),
            "direction": "increases_risk" if row[i] > 0 else "decreases_risk",
        })
    return factors


def generate_shap_artifacts(pipeline, sample_frame: pd.DataFrame, output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Global Importance
    global_imp = compute_global_shap_importance(pipeline, sample_frame)
    (output_dir / "global_feature_importance.json").write_text(
        json.dumps(global_imp, indent=2), encoding="utf-8"
    )

    # 2. Local Sample Explanations (High risk & Low risk examples)
    sample_explanations = []
    for idx in range(min(5, len(sample_frame))):
        row_frame = sample_frame.iloc[[idx]]
        factors = shap_top_factors(pipeline, row_frame, top_k=5)
        sample_explanations.append({
            "sample_index": idx,
            "top_model_contributors": factors,
            "disclaimer": "Top model contributors reflect model feature attributions, not causal claims.",
        })

    (output_dir / "sample_explanations.json").write_text(
        json.dumps(sample_explanations, indent=2), encoding="utf-8"
    )

    print(f"SHAP artifacts written to {output_dir}/")
    return {
        "global_importance": global_imp,
        "sample_explanations": sample_explanations,
    }
