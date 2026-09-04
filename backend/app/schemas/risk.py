from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ml.constants import CURRENCIES, MERCHANT_CATEGORIES, PAYMENT_METHODS


class TransactionIn(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    transaction_id: str = Field(min_length=3, max_length=64)
    merchant_id: str
    amount: float = Field(gt=0, le=10_000_000)
    currency: str = "INR"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_method: str
    device_id: str
    customer_id: str
    customer_account_age_days: int = Field(ge=0, le=20000)
    transaction_count_1h: int = Field(ge=0, le=10000)
    transaction_count_24h: int = Field(ge=0, le=10000)
    amount_sum_24h: float = Field(ge=0)
    customer_avg_amount: float = Field(ge=0, alias="avg_customer_amount")
    amount_deviation: float
    device_age_days: float = Field(ge=0)
    new_device: int = Field(ge=0, le=1)
    location_distance_from_previous: float = Field(ge=0)
    country_risk_score: float = Field(ge=0, le=1)
    failed_attempts_24h: int = Field(ge=0, le=1000)
    account_velocity: float = Field(ge=0)
    merchant_category: str
    customer_history_score: float = Field(ge=0, le=1)
    previous_chargebacks: int = Field(ge=0, le=1000)
    customer_transaction_count: int = Field(ge=0, alias="previous_transaction_count")
    ip_risk_score: float = Field(ge=0, le=1)
    transaction_hour: int | None = Field(default=None, ge=0, le=23)
    is_weekend: int | None = Field(default=None, ge=0, le=1)

    @field_validator("currency")
    @classmethod
    def currency_ok(cls, v: str) -> str:
        if v not in CURRENCIES and v != "INR":
            # allow INR only in this demo, but do not crash on uppercase
            v = v.upper()
        if v not in CURRENCIES:
            raise ValueError("unsupported currency")
        return v

    @field_validator("payment_method")
    @classmethod
    def method_ok(cls, v: str) -> str:
        v = v.lower()
        if v not in PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of {PAYMENT_METHODS}")
        return v

    @field_validator("merchant_category")
    @classmethod
    def cat_ok(cls, v: str) -> str:
        v = v.lower()
        if v not in MERCHANT_CATEGORIES:
            raise ValueError(f"merchant_category must be one of {MERCHANT_CATEGORIES}")
        return v


class FactorOut(BaseModel):
    feature: str
    phrase: str
    contribution: float
    direction: str


class AssessmentOut(BaseModel):
    assessment_id: str
    transaction_id: str
    merchant_id: str | None = None
    customer_id: str | None = None
    device_id: str | None = None
    payment_method: str | None = None
    merchant_category: str | None = None
    timestamp: datetime
    amount: float
    currency: str
    risk_probability: float | None
    risk_level: str
    decision: str
    model_confidence: float | None
    recommended_action: str
    thresholds: dict[str, float]
    model_version: str
    policy_version: str
    top_factors: list[FactorOut]
    explanation_status: str
    degraded: bool
    degraded_reason: str | None
    processing_status: str
    duplicate: bool = False
    audit_id: str | None = None
    review_status: str | None = None


class ReviewActionIn(BaseModel):
    action: Literal["mark_reviewed", "approve", "reject"]
    actor: str = "demo-reviewer"
    note: str | None = None


class HealthOut(BaseModel):
    status: str
    db: str
    model: str
    model_version: str | None
    time: datetime
