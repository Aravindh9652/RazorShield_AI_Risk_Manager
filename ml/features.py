"""Feature matrices for training and inference. No label columns at transform time."""

from __future__ import annotations

import hashlib
import json
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.constants import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    LABEL_COLUMN,
    LEAKAGE_FORBIDDEN_AT_INFERENCE,
    NUMERIC_FEATURES,
)


def assert_no_leakage_columns(columns: list[str]) -> None:
    leaked = set(columns) & set(LEAKAGE_FORBIDDEN_AT_INFERENCE)
    if leaked:
        raise ValueError(f"Leakage columns present at inference: {sorted(leaked)}")


def select_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns: {missing}")
    out = df[FEATURE_COLUMNS].copy()
    assert_no_leakage_columns(list(out.columns))
    out["new_device"] = out["new_device"].astype(int)
    out["is_weekend"] = out["is_weekend"].astype(int)
    return out


def build_preprocessor(scale_numeric: bool) -> ColumnTransformer:
    numeric = StandardScaler() if scale_numeric else "passthrough"
    return ColumnTransformer(
        transformers=[
            ("num", numeric, NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def feature_hash(payload: dict[str, Any]) -> str:
    clipped = {k: payload[k] for k in FEATURE_COLUMNS if k in payload}
    blob = json.dumps(clipped, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def snapshot_features(payload: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in payload.items() if k not in ("transaction_id", "timestamp")}


def to_model_frame(records: list[dict[str, Any]] | pd.DataFrame) -> pd.DataFrame:
    df = pd.DataFrame(records)
    if LABEL_COLUMN in df.columns:
        df = df.drop(columns=[LABEL_COLUMN])
    return select_feature_frame(df)


def labels(df: pd.DataFrame) -> np.ndarray:
    if LABEL_COLUMN not in df.columns:
        raise ValueError("fraud_label required for training/evaluation")
    return df[LABEL_COLUMN].astype(int).to_numpy()
