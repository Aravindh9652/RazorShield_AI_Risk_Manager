#!/usr/bin/env python
"""Write a small deterministic demo CSV (subset of the full generator with a fixed seed)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.constants import RANDOM_SEED
from ml.data_generation import generate_synthetic_transactions


def main() -> None:
    df = generate_synthetic_transactions(n_transactions=400, n_customers=120, n_merchants=24, seed=RANDOM_SEED)
    out = ROOT / "data" / "demo_batch.csv"
    df.to_csv(out, index=False)
    print(f"Wrote demo batch {len(df)} rows -> {out}")


if __name__ == "__main__":
    main()
