#!/usr/bin/env python
"""Generate synthetic transaction CSVs. Synthetic data for demonstration and evaluation."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.constants import DATASET_VERSION, RANDOM_SEED
from ml.data_generation import generate_synthetic_transactions


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic transaction dataset for RazorShield ML pipeline.")
    parser.add_argument("--n-transactions", "--n", type=int, default=18000, help="Number of synthetic transactions")
    parser.add_argument("--n-customers", type=int, default=1800, help="Number of synthetic customers")
    parser.add_argument("--n-merchants", type=int, default=90, help="Number of synthetic merchants")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED, help="Random seed for reproducibility")
    parser.add_argument("--out", type=Path, default=ROOT / "data" / "transactions.csv", help="Output CSV path")
    args = parser.parse_args()

    df = generate_synthetic_transactions(
        n_customers=args.n_customers,
        n_merchants=args.n_merchants,
        n_transactions=args.n_transactions,
        seed=args.seed,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)
    print(f"Wrote {len(df)} rows to {args.out}")
    print(f"dataset_version={DATASET_VERSION}")
    print(f"fraud_rate={df['fraud_label'].mean():.4f}")
    print(df["scenario"].value_counts().to_string())


if __name__ == "__main__":
    main()
