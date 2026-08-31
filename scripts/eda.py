#!/usr/bin/env python
"""
Exploratory Data Analysis (EDA) script for RazorShield ML pipeline.
Generates tabular JSON metrics and PNG figures under artifacts/eda/.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ml.constants import NUMERIC_FEATURES, CATEGORICAL_FEATURES, LABEL_COLUMN


def run_eda(data_path: Path, output_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(data_path)

    # 1. Class Distribution
    total_txns = len(df)
    fraud_count = int(df[LABEL_COLUMN].sum())
    legit_count = total_txns - fraud_count
    fraud_rate = float(df[LABEL_COLUMN].mean())

    class_dist = {
        "total_transactions": total_txns,
        "legitimate_count": legit_count,
        "fraud_count": fraud_count,
        "fraud_percentage": round(fraud_rate * 100, 2),
    }

    # 2. Transaction Amount Distribution
    amt_summary = {
        "overall": {
            "mean": round(float(df["amount"].mean()), 2),
            "median": round(float(df["amount"].median()), 2),
            "std": round(float(df["amount"].std()), 2),
            "min": round(float(df["amount"].min()), 2),
            "max": round(float(df["amount"].max()), 2),
        },
        "legitimate": {
            "mean": round(float(df[df[LABEL_COLUMN] == 0]["amount"].mean()), 2),
            "median": round(float(df[df[LABEL_COLUMN] == 0]["amount"].median()), 2),
            "p75": round(float(df[df[LABEL_COLUMN] == 0]["amount"].quantile(0.75)), 2),
        },
        "fraud": {
            "mean": round(float(df[df[LABEL_COLUMN] == 1]["amount"].mean()), 2),
            "median": round(float(df[df[LABEL_COLUMN] == 1]["amount"].median()), 2),
            "p75": round(float(df[df[LABEL_COLUMN] == 1]["amount"].quantile(0.75)), 2),
        },
    }

    # 3. Fraud Rate by Categorical Features
    cat_fraud_rates = {}
    for cat in CATEGORICAL_FEATURES:
        grouped = df.groupby(cat)[LABEL_COLUMN].agg(["count", "mean"]).reset_index()
        cat_fraud_rates[cat] = {
            row[cat]: {
                "count": int(row["count"]),
                "fraud_rate": round(float(row["mean"]), 4),
            }
            for _, row in grouped.iterrows()
        }

    # 4. Feature Correlations with fraud_label
    num_cols = [c for c in NUMERIC_FEATURES if c in df.columns]
    corr = df[num_cols + [LABEL_COLUMN]].corr()[LABEL_COLUMN].drop(LABEL_COLUMN).to_dict()
    corr_sorted = {k: round(float(v), 4) for k, v in sorted(corr.items(), key=lambda x: abs(x[1]), reverse=True)}

    summary = {
        "dataset_path": str(data_path),
        "class_distribution": class_dist,
        "amount_summary": amt_summary,
        "categorical_fraud_rates": cat_fraud_rates,
        "feature_correlations": corr_sorted,
    }

    # Save JSON summary
    json_path = output_dir / "eda_summary.json"
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"EDA Summary saved to {json_path}")

    # Render Matplotlib / Seaborn plots
    try:
        import matplotlib.pyplot as plt
        import seaborn as sns

        sns.set_theme(style="whitegrid")

        # Fig 1: Class Distribution
        fig, ax = plt.subplots(figsize=(6, 4))
        sns.countplot(data=df, x=LABEL_COLUMN, palette=["#2ecc71", "#e74c3c"], ax=ax)
        ax.set_title("Transaction Class Distribution (0=Legit, 1=Fraud)")
        ax.set_xticklabels(["Legitimate", "Fraud"])
        ax.set_ylabel("Count")
        fig.tight_layout()
        fig.savefig(output_dir / "class_distribution.png", dpi=150)
        plt.close(fig)

        # Fig 2: Amount Distribution (log scale)
        fig, ax = plt.subplots(figsize=(8, 4))
        sns.histplot(
            data=df,
            x="amount",
            hue=LABEL_COLUMN,
            bins=40,
            log_scale=True,
            palette=["#2ecc71", "#e74c3c"],
            element="step",
            ax=ax,
        )
        ax.set_title("Transaction Amount Distribution (Log Scale)")
        ax.set_xlabel("Amount (INR)")
        fig.tight_layout()
        fig.savefig(output_dir / "amount_distribution.png", dpi=150)
        plt.close(fig)

        # Fig 3: Risk Feature Distributions (boxplot grid)
        risk_cols = ["transaction_count_1h", "failed_attempts_24h", "amount_deviation", "ip_risk_score"]
        fig, axes = plt.subplots(2, 2, figsize=(10, 8))
        for ax, col in zip(axes.flatten(), risk_cols):
            if col in df.columns:
                sns.boxplot(data=df, x=LABEL_COLUMN, y=col, palette=["#2ecc71", "#e74c3c"], ax=ax)
                ax.set_title(f"{col} by Class")
                ax.set_xticklabels(["Legit", "Fraud"])
        fig.tight_layout()
        fig.savefig(output_dir / "risk_feature_distributions.png", dpi=150)
        plt.close(fig)

        # Fig 4: Correlation Matrix
        fig, ax = plt.subplots(figsize=(10, 8))
        top_corr_cols = list(corr_sorted.keys())[:10] + [LABEL_COLUMN]
        corr_matrix = df[top_corr_cols].corr()
        sns.heatmap(corr_matrix, annot=True, fmt=".2f", cmap="coolwarm", center=0, ax=ax)
        ax.set_title("Top Feature Correlations with Fraud Label")
        fig.tight_layout()
        fig.savefig(output_dir / "correlation_matrix.png", dpi=150)
        plt.close(fig)

        print(f"EDA Plots saved to {output_dir}/")

    except ImportError as e:
        print(f"Warning: Plot generation skipped ({e}). Summary saved to JSON.")

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Run EDA on RazorShield synthetic dataset.")
    parser.add_argument("--data", type=Path, default=ROOT / "data" / "transactions.csv", help="Dataset CSV path")
    parser.add_argument("--out", type=Path, default=ROOT / "artifacts" / "eda", help="Output directory for EDA artifacts")
    args = parser.parse_args()

    if not args.data.exists():
        print(f"Data file not found at {args.data}. Generating synthetic data first...")
        from ml.data_generation import generate_synthetic_transactions

        df = generate_synthetic_transactions(n_transactions=18000, seed=42)
        args.data.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(args.data, index=False)

    run_eda(args.data, args.out)


if __name__ == "__main__":
    main()
