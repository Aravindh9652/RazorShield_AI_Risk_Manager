#!/usr/bin/env python
"""Print held-out metrics from the last training run (artifacts/test_metrics.json)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    path = ROOT / "artifacts" / "test_metrics.json"
    if not path.exists():
        raise SystemExit("Run scripts/train.py first.")
    meta = json.loads(path.read_text(encoding="utf-8"))
    print(json.dumps(
        {
            "selected_model": meta["selected_model"],
            "thresholds": {"t1": meta["thresholds"]["t1"], "t2": meta["thresholds"]["t2"]},
            "test_at_t2": meta["test_metrics"]["at_t2_high_risk_boundary"],
            "test_at_t1": meta["test_metrics"]["at_t1_review_boundary"],
            "test_cost": meta["test_metrics"]["cost"],
            "models_compared": meta["models_compared"],
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
