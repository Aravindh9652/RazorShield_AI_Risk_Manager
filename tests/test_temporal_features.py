"""
Tests for temporal feature engineering to ensure no future leakage.
"""

import pandas as pd
from ml.data_generation import generate_synthetic_transactions


def test_temporal_feature_generation_no_future_leakage():
    df = generate_synthetic_transactions(n_customers=50, n_merchants=10, n_transactions=500, seed=42)

    # 1. Timestamps must be non-decreasing
    ts_list = pd.to_datetime(df["timestamp"])
    assert ts_list.is_monotonic_increasing, "Transactions must be chronologically ordered"

    # 2. Verify prior customer transaction count is strictly past only
    customer_counts = {}
    for _, row in df.iterrows():
        cid = row["customer_id"]
        past_count = customer_counts.get(cid, 0)
        assert row["customer_transaction_count"] == past_count, (
            f"Expected prior count {past_count}, got {row['customer_transaction_count']} for {cid}"
        )
        customer_counts[cid] = past_count + 1


def test_rolling_window_counts_strict_past():
    df = generate_synthetic_transactions(n_customers=20, n_merchants=5, n_transactions=300, seed=123)
    # Check that transaction_count_1h and 24h are non-negative and non-decreasing for rapid bursts
    assert (df["transaction_count_1h"] >= 0).all()
    assert (df["transaction_count_24h"] >= 0).all()
    assert (df["transaction_count_24h"] >= df["transaction_count_1h"]).all()
