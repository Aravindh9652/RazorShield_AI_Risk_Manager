"""
Tests for ML model training, probability range, and artifact loading.
"""

from pathlib import Path
import joblib
import numpy as np

from ml.data_generation import generate_synthetic_transactions
from ml.train import train_and_select, save_artifacts
from ml.features import select_feature_frame


def test_model_training_and_probabilities(tmp_path: Path):
    df = generate_synthetic_transactions(n_customers=40, n_merchants=5, n_transactions=500, seed=7)

    res = train_and_select(df)

    assert "pipeline" in res
    pipeline = res["pipeline"]

    # Verify probability range on validation set
    X_val = select_feature_frame(res["frames"]["val"])
    probas = pipeline.predict_proba(X_val)[:, 1]

    assert (probas >= 0.0).all() and (probas <= 1.0).all()
    assert not np.isnan(probas).any()

    # Verify model saving and loading
    models_dir = tmp_path / "models"
    artifacts_dir = tmp_path / "artifacts"
    save_artifacts(res, models_dir=models_dir, artifacts_dir=artifacts_dir)

    model_file = models_dir / "risk-model-v1.joblib"
    assert model_file.exists()

    loaded_pipeline = joblib.load(model_file)
    loaded_probas = loaded_pipeline.predict_proba(X_val)[:, 1]

    np.testing.assert_allclose(probas, loaded_probas, rtol=1e-5)
