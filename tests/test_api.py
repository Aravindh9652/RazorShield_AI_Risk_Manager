"""
Backend API integration tests and failure recovery tests for RazorShield FastAPI application.
"""

from datetime import datetime, timezone
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.db.session import Base, make_engine, get_db
from backend.app.services.assess import DatabaseUnavailable


@pytest.fixture(scope="module")
def client():
    import os
    test_url = os.getenv("TEST_DATABASE_URL", "sqlite:///./test_razorshield.db")
    test_engine = make_engine(test_url)
    TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, future=True)

    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "healthy", "degraded")
    assert "db" in data
    assert "model" in data


def test_assess_transaction_flow(client: TestClient):
    payload = {
        "transaction_id": "txn_test_1001",
        "merchant_id": "mch_0001",
        "customer_id": "cust_00001",
        "device_id": "dev_00001",
        "amount": 4500.0,
        "currency": "INR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "upi",
        "merchant_category": "ecommerce",
        "customer_account_age_days": 120,
        "device_age_days": 45.0,
        "new_device": 0,
        "transaction_count_1h": 1,
        "transaction_count_24h": 3,
        "amount_sum_24h": 6500.0,
        "customer_avg_amount": 2200.0,
        "amount_deviation": 1.04,
        "failed_attempts_24h": 0,
        "customer_transaction_count": 15,
        "previous_chargebacks": 0,
        "location_distance_from_previous": 5.0,
        "ip_risk_score": 0.05,
        "country_risk_score": 0.02,
        "account_velocity": 0.625,
        "customer_history_score": 0.85,
    }

    res = client.post("/api/v1/risk/assess", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["transaction_id"] == "txn_test_1001"
    assert data["decision"] in ("ALLOW", "REVIEW", "BLOCK")
    assert data["risk_level"] in ("LOW", "MEDIUM", "HIGH")
    assert "assessment_id" in data
    assert data["duplicate"] is False

    # Idempotent Duplicate Submission Test
    res_dup = client.post("/api/v1/risk/assess", json=payload)
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["duplicate"] is True
    assert dup_data["assessment_id"] == data["assessment_id"]

    res_get = client.get(f"/api/v1/risk/txn_test_1001")
    assert res_get.status_code == 200
    get_data = res_get.json()
    assert get_data["assessment_id"] == data["assessment_id"]


def test_failure_scenario_model_unavailable(client: TestClient):
    payload = {
        "transaction_id": "txn_model_unavail_909",
        "merchant_id": "mch_0001",
        "customer_id": "cust_00001",
        "device_id": "dev_00001",
        "amount": 1200.0,
        "currency": "INR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "upi",
        "merchant_category": "food",
        "customer_account_age_days": 50,
        "device_age_days": 10.0,
        "new_device": 0,
        "transaction_count_1h": 0,
        "transaction_count_24h": 1,
        "amount_sum_24h": 1200.0,
        "customer_avg_amount": 1000.0,
        "amount_deviation": 0.20,
        "failed_attempts_24h": 0,
        "customer_transaction_count": 5,
        "previous_chargebacks": 0,
        "location_distance_from_previous": 0.0,
        "ip_risk_score": 0.01,
        "country_risk_score": 0.01,
        "account_velocity": 0.1,
        "customer_history_score": 0.90,
    }
    with patch("backend.app.services.assess.try_load_model", return_value=None):
        res = client.post("/api/v1/risk/assess", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["degraded"] is True
        assert data["degraded_reason"] == "model_unavailable"
        assert data["decision"] == "REVIEW"
        assert data["risk_level"] == "MEDIUM"


def test_failure_scenario_db_unavailable(client: TestClient):
    payload = {
        "transaction_id": "txn_db_fail_808",
        "merchant_id": "mch_0001",
        "customer_id": "cust_00001",
        "device_id": "dev_00001",
        "amount": 1200.0,
        "currency": "INR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "upi",
        "merchant_category": "food",
        "customer_account_age_days": 50,
        "device_age_days": 10.0,
        "new_device": 0,
        "transaction_count_1h": 0,
        "transaction_count_24h": 1,
        "amount_sum_24h": 1200.0,
        "customer_avg_amount": 1000.0,
        "amount_deviation": 0.20,
        "failed_attempts_24h": 0,
        "customer_transaction_count": 5,
        "previous_chargebacks": 0,
        "location_distance_from_previous": 0.0,
        "ip_risk_score": 0.01,
        "country_risk_score": 0.01,
        "account_velocity": 0.1,
        "customer_history_score": 0.90,
    }
    with patch("backend.app.api.v1.risk.assess_transaction", side_effect=DatabaseUnavailable("DB connection lost")):
        res = client.post("/api/v1/risk/assess", json=payload)
        assert res.status_code == 503
        data = res.json()
        assert "detail" in data
        assert data["detail"]["error"] == "database_unavailable"


def test_failure_scenario_invalid_payload(client: TestClient):
    payload = {
        "transaction_id": "txn_invalid_707",
        "merchant_id": "mch_0001",
        "customer_id": "cust_00001",
        "device_id": "dev_00001",
        "amount": -500.0,  # Negative amount invalid
        "currency": "INVALID_CURRENCY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "invalid_method",
        "merchant_category": "invalid_cat",
        "customer_account_age_days": 120,
        "device_age_days": 45.0,
        "new_device": 0,
        "transaction_count_1h": 1,
        "transaction_count_24h": 3,
        "amount_sum_24h": 6500.0,
        "customer_avg_amount": 2200.0,
        "amount_deviation": 1.04,
        "failed_attempts_24h": 0,
        "customer_transaction_count": 15,
        "previous_chargebacks": 0,
        "location_distance_from_previous": 5.0,
        "ip_risk_score": 0.05,
        "country_risk_score": 0.02,
        "account_velocity": 0.625,
        "customer_history_score": 0.85,
    }
    res = client.post("/api/v1/risk/assess", json=payload)
    assert res.status_code == 422


def test_failure_scenario_shap_explanation_failure(client: TestClient):
    payload = {
        "transaction_id": "txn_shap_fail_606",
        "merchant_id": "mch_0001",
        "customer_id": "cust_00001",
        "device_id": "dev_00001",
        "amount": 2500.0,
        "currency": "INR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "card",
        "merchant_category": "fashion",
        "customer_account_age_days": 120,
        "device_age_days": 45.0,
        "new_device": 0,
        "transaction_count_1h": 1,
        "transaction_count_24h": 3,
        "amount_sum_24h": 6500.0,
        "customer_avg_amount": 2200.0,
        "amount_deviation": 1.04,
        "failed_attempts_24h": 0,
        "customer_transaction_count": 15,
        "previous_chargebacks": 0,
        "location_distance_from_previous": 5.0,
        "ip_risk_score": 0.05,
        "country_risk_score": 0.02,
        "account_velocity": 0.625,
        "customer_history_score": 0.85,
    }
    with patch("ml.explain.shap_top_factors", side_effect=Exception("SHAP explainer memory error")):
        res = client.post("/api/v1/risk/assess", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["explanation_status"] == "failed"
        assert data["decision"] in ("ALLOW", "REVIEW", "BLOCK")


def test_list_assessments_endpoint(client: TestClient):
    res = client.get("/api/v1/risk/assessments")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0


def test_metrics_endpoint(client: TestClient):
    res = client.get("/api/v1/risk/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "operational" in data
    assert "heldout" in data
    assert "thresholds" in data


def test_review_decision_submission(client: TestClient):
    txn_id = "txn_review_test_505"
    payload = {
        "transaction_id": txn_id,
        "merchant_id": "mch_0002",
        "customer_id": "cust_00002",
        "device_id": "dev_00002",
        "amount": 95000.0,
        "currency": "INR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payment_method": "card",
        "merchant_category": "electronics",
        "customer_account_age_days": 10,
        "device_age_days": 0.0,
        "new_device": 1,
        "transaction_count_1h": 6,
        "transaction_count_24h": 12,
        "amount_sum_24h": 180000.0,
        "customer_avg_amount": 1500.0,
        "amount_deviation": 62.3,
        "failed_attempts_24h": 4,
        "customer_transaction_count": 2,
        "previous_chargebacks": 1,
        "location_distance_from_previous": 1200.0,
        "ip_risk_score": 0.85,
        "country_risk_score": 0.70,
        "account_velocity": 3.5,
        "customer_history_score": 0.25,
    }

    res = client.post("/api/v1/risk/assess", json=payload)
    assert res.status_code == 200

    rev_payload = {
        "action": "approve",
        "actor": "senior_analyst",
        "note": "Verified customer identity via OTP",
    }
    res_rev = client.post(f"/api/v1/review/{txn_id}/action", json=rev_payload)
    assert res_rev.status_code == 200
    rev_data = res_rev.json()
    assert rev_data["review_status"] == "approved"


def test_audit_logs_endpoint(client: TestClient):
    res = client.get("/api/v1/audit/logs")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0
