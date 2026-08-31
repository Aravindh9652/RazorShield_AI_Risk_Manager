"""
Tests for temporal dataset splitting methodology.
"""

import pandas as pd
from ml.data_generation import generate_synthetic_transactions
from ml.split import temporal_split


def test_temporal_split_chronological_ordering():
    df = generate_synthetic_transactions(n_customers=30, n_merchants=5, n_transactions=600, seed=99)

    train, val, test = temporal_split(df, train_frac=0.70, val_frac=0.15)

    assert len(train) + len(val) + len(test) == len(df)
    assert len(train) == int(len(df) * 0.70)
    assert len(val) == int(len(df) * 0.15)

    # Train timestamps < Validation timestamps < Test timestamps
    max_train_ts = pd.to_datetime(train["timestamp"]).max()
    min_val_ts = pd.to_datetime(val["timestamp"]).min()
    max_val_ts = pd.to_datetime(val["timestamp"]).max()
    min_test_ts = pd.to_datetime(test["timestamp"]).min()

    assert max_train_ts <= min_val_ts, "Train timestamps must precede Validation timestamps"
    assert max_val_ts <= min_test_ts, "Validation timestamps must precede Test timestamps"
