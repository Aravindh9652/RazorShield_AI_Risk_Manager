"""Train logistic regression, random forest, and XGBoost. Persist the winner."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from ml.constants import DATASET_VERSION, MODEL_VERSION, POLICY_VERSION, RANDOM_SEED
from ml.cost_model import expected_cost
from ml.evaluate import binary_metrics, curve_payloads
from ml.features import build_preprocessor, labels, select_feature_frame
from ml.split import temporal_split
from ml.thresholds import sweep_thresholds

ROOT = Path(__file__).resolve().parents[1]


def _make_models(y_train: np.ndarray) -> dict[str, Pipeline]:
    pos = max(int(y_train.sum()), 1)
    neg = max(len(y_train) - pos, 1)
    spw = neg / pos
    return {
        "logistic_regression": Pipeline(
            [
                ("prep", build_preprocessor(scale_numeric=True)),
                (
                    "clf",
                    LogisticRegression(
                        max_iter=400,
                        class_weight="balanced",
                        random_state=RANDOM_SEED,
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            [
                ("prep", build_preprocessor(scale_numeric=False)),
                (
                    "clf",
                    RandomForestClassifier(
                        n_estimators=180,
                        max_depth=10,
                        min_samples_leaf=8,
                        class_weight="balanced_subsample",
                        n_jobs=-1,
                        random_state=RANDOM_SEED,
                    ),
                ),
            ]
        ),
        "xgboost": Pipeline(
            [
                ("prep", build_preprocessor(scale_numeric=False)),
                (
                    "clf",
                    XGBClassifier(
                        n_estimators=220,
                        max_depth=5,
                        learning_rate=0.06,
                        subsample=0.85,
                        colsample_bytree=0.85,
                        min_child_weight=4,
                        reg_lambda=1.2,
                        objective="binary:logistic",
                        eval_metric="aucpr",
                        scale_pos_weight=spw,
                        random_state=RANDOM_SEED,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def train_and_select(df: pd.DataFrame) -> dict[str, Any]:
    train, val, test = temporal_split(df)
    X_train = select_feature_frame(train)
    X_val = select_feature_frame(val)
    X_test = select_feature_frame(test)
    y_train, y_val, y_test = labels(train), labels(val), labels(test)
    amt_val = val["amount"].to_numpy()
    amt_test = test["amount"].to_numpy()

    models = _make_models(y_train)
    comparison = []
    fitted = {}
    for name, pipe in models.items():
        pipe.fit(X_train, y_train)
        fitted[name] = pipe
        val_p = pipe.predict_proba(X_val)[:, 1]
        test_p = pipe.predict_proba(X_test)[:, 1]
        val_m = binary_metrics(y_val, val_p, 0.5)
        # Selection: PR-AUC on validation (fraud is imbalanced; accuracy is insufficient)
        comparison.append(
            {
                "model": name,
                "val_pr_auc": val_m["pr_auc"],
                "val_roc_auc": val_m["roc_auc"],
                "val_f1_at_0.5": val_m["f1"],
                "val_precision_at_0.5": val_m["precision"],
                "val_recall_at_0.5": val_m["recall"],
            }
        )

    comparison.sort(key=lambda r: r["val_pr_auc"], reverse=True)
    winner_name = comparison[0]["model"]
    winner = fitted[winner_name]

    val_p = winner.predict_proba(X_val)[:, 1]
    sweep = sweep_thresholds(y_val, val_p, amt_val)
    t1 = sweep["selected"]["t1"]
    t2 = sweep["selected"]["t2"]

    test_p = winner.predict_proba(X_test)[:, 1]
    # Report binary metrics at t2 as the "high risk" operating point, plus t1 for review.
    test_at_t1 = binary_metrics(y_test, test_p, t1)
    test_at_t2 = binary_metrics(y_test, test_p, t2)
    test_at_50 = binary_metrics(y_test, test_p, 0.5)
    curves = curve_payloads(y_test, test_p)
    test_cost = expected_cost(y_test, test_p, amt_test, t1, t2)

    feature_names = list(winner.named_steps["prep"].get_feature_names_out())

    payload = {
        "model_version": MODEL_VERSION,
        "dataset_version": DATASET_VERSION,
        "policy_version": POLICY_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "split": {
            "method": "temporal",
            "train_frac": 0.70,
            "val_frac": 0.15,
            "test_frac": 0.15,
            "n_train": int(len(train)),
            "n_val": int(len(val)),
            "n_test": int(len(test)),
            "rationale": (
                "Transactions are ordered by timestamp. Future rows never enter training. "
                "Validation is used only for model selection and threshold/cost search. "
                "Held-out test is reported once."
            ),
        },
        "label_prevalence": {
            "train": float(y_train.mean()),
            "val": float(y_val.mean()),
            "test": float(y_test.mean()),
        },
        "models_compared": comparison,
        "selected_model": winner_name,
        "selection_rule": "Highest PR-AUC on the validation set. Accuracy is not used.",
        "thresholds": {
            "t1": t1,
            "t2": t2,
            "validation_cost": sweep["selected"],
            "naive_0_5_comparison": sweep["naive_0_5"],
        },
        "test_metrics": {
            "at_t1_review_boundary": test_at_t1,
            "at_t2_high_risk_boundary": test_at_t2,
            "at_0_5_reference": test_at_50,
            "cost": {**test_cost, "disclaimer": "illustrative synthetic cost assumptions"},
        },
        "curves": curves,
        "threshold_cost_curve": [
            {"t1": r["t1"], "t2": r["t2"], "total_estimated_decision_cost": r["total_estimated_decision_cost"]}
            for r in sweep["curve"]
            if abs(r["t1"] - t1) < 1e-9 or abs(r["t2"] - t2) < 1e-9
        ],
        "full_threshold_sweep": sweep["curve"],
        "feature_names_out": feature_names,
        "winner_name": winner_name,
    }
    return {
        "pipeline": winner,
        "all_models": fitted,
        "metadata": payload,
        "frames": {"train": train, "val": val, "test": test},
        "test_proba": test_p,
        "val_proba": val_p,
        "X_train": X_train,
    }


def save_artifacts(result: dict[str, Any], models_dir: Path | None = None, artifacts_dir: Path | None = None) -> None:
    import joblib
    from ml.explain import generate_shap_artifacts

    models_dir = models_dir or (ROOT / "models")
    artifacts_dir = artifacts_dir or (ROOT / "artifacts")
    model_version_dir = artifacts_dir / "models" / MODEL_VERSION
    shap_dir = artifacts_dir / "shap"

    models_dir.mkdir(parents=True, exist_ok=True)
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    model_version_dir.mkdir(parents=True, exist_ok=True)
    shap_dir.mkdir(parents=True, exist_ok=True)

    # Serialize trained pipeline to models/ and artifacts/models/risk-model-v1/
    joblib.dump(result["pipeline"], models_dir / f"{MODEL_VERSION}.joblib")
    joblib.dump(result["pipeline"], model_version_dir / "model.joblib")
    joblib.dump(result["all_models"], models_dir / f"{MODEL_VERSION}-all.joblib")

    meta = {k: v for k, v in result["metadata"].items() if k != "full_threshold_sweep"}
    meta["artifact"] = f"{MODEL_VERSION}.joblib"
    (models_dir / f"{MODEL_VERSION}.meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    (model_version_dir / "metadata.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Full metrics including sweep
    (artifacts_dir / "test_metrics.json").write_text(json.dumps(result["metadata"], indent=2), encoding="utf-8")
    (artifacts_dir / "threshold_sweep.json").write_text(
        json.dumps(result["metadata"]["full_threshold_sweep"]), encoding="utf-8"
    )

    # SHAP explainability artifacts
    val_sample = result["X_train"].iloc[:200]
    generate_shap_artifacts(result["pipeline"], val_sample, shap_dir)

