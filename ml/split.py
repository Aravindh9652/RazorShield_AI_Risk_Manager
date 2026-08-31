"""Temporal train / validation / test split to avoid future leakage."""

from __future__ import annotations

import pandas as pd

from ml.constants import TIMESTAMP_COLUMN


def temporal_split(
    df: pd.DataFrame,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Sort by timestamp. Earliest train_frac -> train, next val_frac -> validation,
    remainder -> held-out test.

    Why temporal: payment risk is non-stationary. A random split would let future
    velocity and customer-state patterns leak into training.
    """
    if not 0 < train_frac < 1 or not 0 < val_frac < 1 or train_frac + val_frac >= 1:
        raise ValueError("fractions must be positive and train+val < 1")
    ordered = df.copy()
    ordered["_ts"] = pd.to_datetime(ordered[TIMESTAMP_COLUMN], utc=True)
    ordered = ordered.sort_values("_ts").reset_index(drop=True)
    n = len(ordered)
    train_end = int(n * train_frac)
    val_end = int(n * (train_frac + val_frac))
    train = ordered.iloc[:train_end].drop(columns=["_ts"])
    val = ordered.iloc[train_end:val_end].drop(columns=["_ts"])
    test = ordered.iloc[val_end:].drop(columns=["_ts"])
    return train, val, test
