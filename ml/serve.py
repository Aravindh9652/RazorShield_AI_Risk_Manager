"""Load the persisted winner pipeline for the API."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from ml.constants import MODEL_VERSION
from ml.features import feature_hash, snapshot_features, to_model_frame

ROOT = Path(__file__).resolve().parents[1]


class ModelBundle:
    def __init__(self, pipeline, metadata: dict[str, Any], models_dir: Path):
        self.pipeline = pipeline
        self.metadata = metadata
        self.models_dir = models_dir

    @property
    def version(self) -> str:
        return self.metadata.get("model_version", MODEL_VERSION)

    @property
    def t1(self) -> float:
        return float(self.metadata["thresholds"]["t1"])

    @property
    def t2(self) -> float:
        return float(self.metadata["thresholds"]["t2"])

    def predict_proba_one(self, payload: dict[str, Any]) -> float:
        frame = to_model_frame([payload])
        proba = self.pipeline.predict_proba(frame)[0, 1]
        return float(proba)


def load_bundle(models_dir: Path | None = None, version: str = MODEL_VERSION) -> ModelBundle:
    models_dir = models_dir or (ROOT / "models")
    path = models_dir / f"{version}.joblib"
    meta_path = models_dir / f"{version}.meta.json"
    if not path.exists():
        alt_path = ROOT / "artifacts" / "models" / version / "model.joblib"
        alt_meta = ROOT / "artifacts" / "models" / version / "metadata.json"
        if alt_path.exists():
            path = alt_path
            meta_path = alt_meta
        else:
            raise FileNotFoundError(f"Model artifact missing: {path}")
    pipeline = joblib.load(path)
    metadata = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    return ModelBundle(pipeline, metadata, models_dir)
