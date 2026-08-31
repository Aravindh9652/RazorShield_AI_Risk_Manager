"""
Tests for data leakage prevention.
"""

import pytest
import pandas as pd
from ml.constants import FEATURE_COLUMNS, LABEL_COLUMN
from ml.features import assert_no_leakage_columns, select_feature_frame, to_model_frame


def test_assert_no_leakage_columns():
    valid_cols = ["amount", "transaction_count_1h", "new_device"]
    assert_no_leakage_columns(valid_cols)  # should pass cleanly

    leaked_cols = ["amount", "fraud_label"]
    with pytest.raises(ValueError, match="Leakage columns present at inference"):
        assert_no_leakage_columns(leaked_cols)


def test_select_feature_frame_drops_label():
    sample_data = {col: [1.0] if col not in ("currency", "payment_method", "merchant_category") else ["card"] for col in FEATURE_COLUMNS}
    sample_data["fraud_label"] = [1]
    sample_data["extra_column"] = ["secret"]

    df = pd.DataFrame(sample_data)
    feature_df = select_feature_frame(df)

    assert LABEL_COLUMN not in feature_df.columns
    assert "extra_column" not in feature_df.columns
    assert list(feature_df.columns) == FEATURE_COLUMNS


def test_to_model_frame_strips_fraud_label():
    records = [{"amount": 500.0, "currency": "INR", "payment_method": "upi", "merchant_category": "ecommerce", "fraud_label": 0}]
    # Fill required features
    for col in FEATURE_COLUMNS:
        if col not in records[0]:
            records[0][col] = 0

    model_df = to_model_frame(records)
    assert LABEL_COLUMN not in model_df.columns
