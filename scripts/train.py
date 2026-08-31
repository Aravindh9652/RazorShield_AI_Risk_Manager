#!/usr/bin/env python
"""Train baselines + XGBoost, select by validation PR-AUC, persist artifacts."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.train import save_artifacts, train_and_select


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=ROOT / "data" / "transactions.csv")
    args = parser.parse_args()
    if not args.data.exists():
        raise SystemExit(f"Missing dataset {args.data}. Run scripts/generate_data.py first.")
    df = pd.read_csv(args.data)
    result = train_and_select(df)
    save_artifacts(result)
    meta = result["metadata"]
    print("Selected model:", meta["selected_model"])
    print("Validation comparison:")
    for row in meta["models_compared"]:
        print(
            f"  {row['model']}: PR-AUC={row['val_pr_auc']:.4f} ROC-AUC={row['val_roc_auc']:.4f} "
            f"F1@0.5={row['val_f1_at_0.5']:.4f}"
        )
    print("Thresholds t1/t2:", meta["thresholds"]["t1"], meta["thresholds"]["t2"])
    tm = meta["test_metrics"]["at_t2_high_risk_boundary"]
    print("Held-out test at t2:", {k: tm[k] for k in ("precision", "recall", "f1", "roc_auc", "pr_auc", "confusion_matrix")})


if __name__ == "__main__":
    main()
