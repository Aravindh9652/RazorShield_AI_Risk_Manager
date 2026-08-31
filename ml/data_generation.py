"""
Synthetic transaction generator for RazorShield ML pipeline.

Generates realistic temporal transaction histories across merchants, customers, and devices.
Implements 10 controlled synthetic fraud scenarios:
1. Abnormally large transaction compared to customer history
2. High transaction velocity (1h/24h burst)
3. New device + unusual transaction amount
4. Multiple failed attempts preceding transaction
5. Unusual geographic movement (location distance jump)
6. Suspicious IP / high country risk score
7. Customer with prior chargeback history
8. Short-time transaction bursts
9. Combined multi-factor weak risk signals
10. Legitimate high-value transactions (travel/electronics) NOT labeled fraud

Strict temporal feature engineering: all historical aggregations use ONLY prior transactions.
Label generation is probabilistic and scenario-driven with realistic overlap.
"""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd

from ml.constants import (
    DATASET_VERSION,
    MERCHANT_CATEGORIES,
    PAYMENT_METHODS,
    RANDOM_SEED,
)


def _sigmoid(x: np.ndarray | float) -> np.ndarray | float:
    x = np.clip(x, -20, 20)
    return 1.0 / (1.0 + np.exp(-x))


def generate_synthetic_transactions(
    n_customers: int = 1800,
    n_merchants: int = 90,
    n_transactions: int = 18000,
    start: datetime | None = None,
    n_days: int = 120,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    if start is None:
        start = datetime(2025, 11, 1, tzinfo=timezone.utc)

    # 1. Merchants Setup
    merchants = []
    for i in range(n_merchants):
        cat = MERCHANT_CATEGORIES[i % len(MERCHANT_CATEGORIES)]
        typical = {
            "ecommerce": 1800,
            "travel": 12000,
            "food": 450,
            "utilities": 1600,
            "digital_goods": 700,
            "electronics": 14000,
            "fashion": 2200,
            "education": 5000,
        }[cat]
        merchants.append(
            {
                "merchant_id": f"mch_{i:04d}",
                "category": cat,
                "typical_amount": typical,
            }
        )

    # 2. Customers Setup
    customers = []
    for i in range(n_customers):
        created_offset = int(rng.integers(30, 1400))
        is_risky_cohort = rng.random() < 0.07
        prior_cb = int(rng.integers(1, 4)) if is_risky_cohort else 0
        customers.append(
            {
                "customer_id": f"cust_{i:05d}",
                "account_age_start": created_offset,
                "typical_amount": float(np.exp(rng.normal(7.2, 0.6))),
                "home_country_risk": float(np.clip(rng.beta(1.5, 10), 0.01, 0.4)),
                "base_ip_risk": float(np.clip(rng.beta(1.5, 10), 0.01, 0.4)),
                "prior_chargebacks": prior_cb,
                "is_risky_cohort": is_risky_cohort,
            }
        )

    # 3. Pre-generate Timestamps (Sorted Chronologically)
    timestamps = []
    for _ in range(n_transactions):
        day = float(rng.uniform(0, n_days))
        # Hour distribution: slight peak during afternoon/evening
        hour_val = float(rng.beta(2.2, 1.8) * 23.9)
        ts = start + timedelta(days=day, hours=hour_val, seconds=float(rng.uniform(0, 3600)))
        timestamps.append(ts)
    timestamps.sort()

    # Tracking Customer State & History (Past-only, no future leakage)
    customer_history: dict[str, list[dict[str, Any]]] = defaultdict(list)
    customer_device: dict[str, tuple[str, datetime]] = {}
    customer_last_loc: dict[str, float] = {}
    hour_windows: dict[str, deque] = defaultdict(deque)
    day_windows: dict[str, deque] = defaultdict(deque)

    rows: list[dict[str, Any]] = []

    # Scenario types to assign periodically
    scenarios = [
        "large_amount",          # Scenario 1
        "high_velocity",         # Scenario 2
        "new_device_amount",     # Scenario 3
        "failed_attempts_burst", # Scenario 4
        "geo_jump",              # Scenario 5
        "suspicious_ip_country", # Scenario 6
        "prior_chargebacks",     # Scenario 7
        "short_time_burst",      # Scenario 8
        "combined_weak_signals", # Scenario 9
        "legit_high_value",      # Scenario 10
    ]

    recent_customers: deque = deque(maxlen=200)

    for seq, ts in enumerate(timestamps):
        # Pick customer (30% chance to reuse recent customer for natural temporal clusters)
        if recent_customers and rng.random() < 0.30:
            c_idx = int(rng.choice(list(recent_customers)))
        else:
            c_idx = int(rng.integers(0, n_customers))
        recent_customers.append(c_idx)

        cust = customers[c_idx]
        cid = cust["customer_id"]
        m = merchants[int(rng.integers(0, n_merchants))]

        # Determine if this transaction is part of an active synthetic scenario
        scenario = "organic"
        if rng.random() < 0.12:
            scenario = str(rng.choice(scenarios))

        # Device handling
        is_new_device_scenario = scenario in ("new_device_amount", "combined_weak_signals")
        if cid not in customer_device or is_new_device_scenario or rng.random() < 0.03:
            device_id = f"dev_{cid}_{seq}"
            device_seen = ts
            customer_device[cid] = (device_id, device_seen)
            new_device = 1
            device_age_days = 0.0
        else:
            device_id, device_seen = customer_device[cid]
            new_device = 0
            device_age_days = max(0.0, (ts - device_seen).total_seconds() / 86400.0)

        account_age = cust["account_age_start"] + (ts - start).days

        # Location distance jump
        prev_loc = customer_last_loc.get(cid, 0.0)
        jump = 0.0
        if scenario in ("geo_jump", "combined_weak_signals"):
            jump = float(rng.uniform(600, 3500))
        elif rng.random() < 0.04:
            jump = float(rng.uniform(20, 250))
        location_distance = jump
        customer_last_loc[cid] = prev_loc + jump

        # Failed attempts in 24h
        failed_attempts = 0
        if scenario == "failed_attempts_burst":
            failed_attempts = int(rng.integers(3, 9))
        elif scenario == "combined_weak_signals":
            failed_attempts = int(rng.integers(2, 5))
        elif rng.random() < 0.08:
            failed_attempts = 1

        # Transaction Amount Calculation
        base_amt = 0.6 * cust["typical_amount"] + 0.4 * m["typical_amount"]
        amount = float(np.clip(rng.lognormal(np.log(max(base_amt, 50)), 0.5), 40, 300000))

        if scenario in ("large_amount", "new_device_amount"):
            amount *= float(rng.uniform(4.0, 10.0))
        elif scenario == "legit_high_value":
            # Legitimate high-value (Scenario 10): e.g. Travel/Electronics purchase
            amount *= float(rng.uniform(3.5, 7.0))
        elif scenario == "combined_weak_signals":
            amount *= float(rng.uniform(2.0, 4.5))

        # Temporal Rolling Windows (STRICT PAST ONLY)
        cutoff_1h = ts - timedelta(hours=1)
        cutoff_24h = ts - timedelta(hours=24)
        h_q = hour_windows[cid]
        d_q = day_windows[cid]

        while h_q and h_q[0][0] < cutoff_1h:
            h_q.popleft()
        while d_q and d_q[0][0] < cutoff_24h:
            d_q.popleft()

        txn_1h = len(h_q)
        txn_24h = len(d_q)
        amt_24h = float(sum(x[1] for x in d_q))

        if scenario in ("high_velocity", "short_time_burst"):
            burst_add = int(rng.integers(4, 9))
            txn_1h += burst_add
            txn_24h += burst_add
            amt_24h += amount * burst_add * 0.5

        account_velocity = float(txn_24h / 24.0 + txn_1h * 0.5)

        # Customer History Aggregations (STRICT PAST ONLY)
        prior_txns = customer_history[cid]
        prev_count = len(prior_txns)
        if prev_count > 0:
            avg_amt = float(np.mean([p["amount"] for p in prior_txns]))
        else:
            avg_amt = amount

        amount_deviation = float((amount - avg_amt) / (avg_amt + 1.0))

        prev_chargebacks = cust["prior_chargebacks"]
        if scenario == "prior_chargebacks":
            prev_chargebacks = max(prev_chargebacks, int(rng.integers(2, 5)))

        if prev_count == 0:
            history_score = float(np.clip(0.65 - 0.15 * prev_chargebacks, 0.05, 0.95))
        else:
            prior_fraud_rate = float(np.mean([p["fraud_label"] for p in prior_txns]))
            history_score = float(np.clip(0.80 - 0.50 * prior_fraud_rate - 0.10 * prev_chargebacks, 0.05, 0.95))

        # Risk Scores
        country_risk = cust["home_country_risk"]
        ip_risk = cust["base_ip_risk"]

        if scenario == "suspicious_ip_country":
            country_risk = float(np.clip(country_risk + rng.uniform(0.40, 0.70), 0.4, 0.95))
            ip_risk = float(np.clip(ip_risk + rng.uniform(0.45, 0.75), 0.45, 0.95))
        elif scenario == "combined_weak_signals":
            country_risk = float(np.clip(country_risk + 0.25, 0.2, 0.7))
            ip_risk = float(np.clip(ip_risk + 0.25, 0.2, 0.7))

        hour = ts.hour
        is_weekend = 1 if ts.weekday() >= 5 else 0
        method = str(rng.choice(PAYMENT_METHODS, p=[0.48, 0.30, 0.12, 0.10]))

        # Latent Risk Calculation (Scenario & Feature Driven, Probabilistic)
        latent_score = -2.4  # base negative (mostly legit organic)

        if scenario == "organic":
            # Organic baseline low fraud rate (~2.5%)
            latent_score += rng.normal(0, 0.4)
        elif scenario == "legit_high_value":
            # Scenario 10: Legitimate high-value purchase -> Suppress risk!
            latent_score = -3.2
        elif scenario == "large_amount":
            latent_score += 1.8 * np.tanh(amount_deviation / 4.0)
        elif scenario == "high_velocity":
            latent_score += 2.2 * np.tanh(txn_1h / 4.0)
        elif scenario == "new_device_amount":
            latent_score += 1.6 * new_device + 1.4 * np.tanh(amount_deviation / 3.0)
        elif scenario == "failed_attempts_burst":
            latent_score += 2.0 * np.tanh(failed_attempts / 3.0)
        elif scenario == "geo_jump":
            latent_score += 1.9 * np.tanh(location_distance / 1200.0)
        elif scenario == "suspicious_ip_country":
            latent_score += 1.8 * ip_risk + 1.5 * country_risk
        elif scenario == "prior_chargebacks":
            latent_score += 2.1 * (1.0 - history_score) + 1.2 * prev_chargebacks
        elif scenario == "short_time_burst":
            latent_score += 2.3 * np.tanh(txn_1h / 3.0)
        elif scenario == "combined_weak_signals":
            # Scenario 9: Multiple weak signals combining into high risk
            latent_score += (
                0.8 * new_device
                + 0.7 * np.tanh(amount_deviation / 2.0)
                + 0.6 * np.tanh(failed_attempts / 2.0)
                + 0.6 * ip_risk
                + 0.5 * country_risk
            )

        # Calculate Fraud Probability via Sigmoid
        p_fraud = float(_sigmoid(latent_score))

        # Sample Fraud Label
        fraud_label = int(rng.random() < p_fraud)

        # Add 3% Label Noise to prevent deterministic linear separability
        if rng.random() < 0.03:
            fraud_label = 1 - fraud_label

        row = {
            "transaction_id": f"txn_{seq:07d}",
            "merchant_id": m["merchant_id"],
            "customer_id": cid,
            "device_id": device_id,
            "amount": round(amount, 2),
            "currency": "INR",
            "payment_method": method,
            "timestamp": ts.isoformat(),
            "merchant_category": m["category"],
            "customer_account_age_days": int(account_age),
            "device_age_days": round(device_age_days, 2),
            "new_device": int(new_device),
            "transaction_count_1h": int(txn_1h),
            "transaction_count_24h": int(txn_24h),
            "amount_sum_24h": round(amt_24h, 2),
            "customer_avg_amount": round(avg_amt, 2),
            "amount_deviation": round(amount_deviation, 4),
            "failed_attempts_24h": int(failed_attempts),
            "customer_transaction_count": int(prev_count),
            "previous_chargebacks": int(prev_chargebacks),
            "location_distance_from_previous": round(location_distance, 1),
            "ip_risk_score": round(ip_risk, 4),
            "country_risk_score": round(country_risk, 4),
            "transaction_hour": int(hour),
            "is_weekend": int(is_weekend),
            "account_velocity": round(account_velocity, 4),
            "customer_history_score": round(history_score, 4),
            "fraud_label": int(fraud_label),
            "dataset_version": DATASET_VERSION,
            "scenario": scenario,
        }
        rows.append(row)

        # Update History AFTER transaction decision (NO FUTURE LEAKAGE)
        customer_history[cid].append({"amount": amount, "fraud_label": fraud_label, "ts": ts})
        h_q.append((ts, amount))
        d_q.append((ts, amount))

    df = pd.DataFrame(rows)
    return df
