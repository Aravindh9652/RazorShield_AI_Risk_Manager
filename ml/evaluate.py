"""Classification metrics. Accuracy is computed but not used for selection."""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)


def binary_metrics(y_true: np.ndarray, proba: np.ndarray, threshold: float = 0.5) -> dict[str, Any]:
    y_pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "threshold": threshold,
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, proba)) if len(np.unique(y_true)) > 1 else None,
        "pr_auc": float(average_precision_score(y_true, proba)),
        "accuracy": float((tp + tn) / max(tp + tn + fp + fn, 1)),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "positive_rate": float(np.mean(y_true)),
        "predicted_positive_rate": float(np.mean(y_pred)),
    }


def curve_payloads(y_true: np.ndarray, proba: np.ndarray) -> dict[str, Any]:
    prec, rec, pr_thr = precision_recall_curve(y_true, proba)
    fpr, tpr, roc_thr = roc_curve(y_true, proba)
    # downsample for JSON/UI
    def _ds(xs, n=80):
        if len(xs) <= n:
            return xs.tolist()
        idx = np.linspace(0, len(xs) - 1, n).astype(int)
        return np.asarray(xs)[idx].tolist()

    return {
        "pr_curve": {"recall": _ds(rec), "precision": _ds(prec)},
        "roc_curve": {"fpr": _ds(fpr), "tpr": _ds(tpr)},
    }
