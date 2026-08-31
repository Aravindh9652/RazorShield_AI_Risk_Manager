"""Shared constants for RazorShield ML and serving."""

DATASET_VERSION = "synthetic-v1"
MODEL_VERSION = "risk-model-v1"
POLICY_VERSION = "policy-v1"
RANDOM_SEED = 42

# Columns allowed at inference. fraud_label is training-only.
ID_COLUMNS = [
    "transaction_id",
    "merchant_id",
    "customer_id",
    "device_id",
]

CATEGORICAL_FEATURES = [
    "currency",
    "payment_method",
    "merchant_category",
]

NUMERIC_FEATURES = [
    "amount",
    "customer_account_age_days",
    "transaction_count_1h",
    "transaction_count_24h",
    "amount_sum_24h",
    "customer_avg_amount",
    "amount_deviation",
    "device_age_days",
    "new_device",
    "location_distance_from_previous",
    "country_risk_score",
    "failed_attempts_24h",
    "account_velocity",
    "customer_history_score",
    "previous_chargebacks",
    "customer_transaction_count",
    "ip_risk_score",
    "transaction_hour",
    "is_weekend",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
LABEL_COLUMN = "fraud_label"
TIMESTAMP_COLUMN = "timestamp"

LEAKAGE_FORBIDDEN_AT_INFERENCE = [LABEL_COLUMN]

PAYMENT_METHODS = ["upi", "card", "netbanking", "wallet"]
CURRENCIES = ["INR"]
MERCHANT_CATEGORIES = [
    "ecommerce",
    "travel",
    "food",
    "utilities",
    "digital_goods",
    "electronics",
    "fashion",
    "education",
]

FEATURE_PHRASES = {
    "amount": "Transaction amount relative to typical spend",
    "customer_account_age_days": "Customer account age",
    "transaction_count_1h": "Transaction velocity (1 hour)",
    "transaction_count_24h": "Transaction velocity (24 hours)",
    "amount_sum_24h": "Spend volume in the last 24 hours",
    "customer_avg_amount": "Customer's historical average amount",
    "amount_deviation": "Deviation from the customer's usual amount",
    "device_age_days": "Age of the device on this account",
    "new_device": "New or recently seen device",
    "location_distance_from_previous": "Geographic distance from the previous transaction",
    "country_risk_score": "Country risk score",
    "failed_attempts_24h": "Failed payment attempts in 24 hours",
    "account_velocity": "Account activity velocity",
    "customer_history_score": "Prior customer history score",
    "previous_chargebacks": "Previous chargebacks on the customer",
    "customer_transaction_count": "Prior transaction count",
    "ip_risk_score": "IP risk score",
    "transaction_hour": "Hour of day",
    "is_weekend": "Weekend transaction",
    "currency": "Currency",
    "payment_method": "Payment method",
    "merchant_category": "Merchant category",
}

DEFAULT_COST = {
    "fraud_loss_multiplier": 1.0,
    "review_cost": 120.0,
    "customer_friction_cost": 80.0,
    "blocked_legitimate_cost": 400.0,
    "currency": "INR",
    "disclaimer": "illustrative synthetic cost assumptions",
}
