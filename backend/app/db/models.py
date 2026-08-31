import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.session import Base


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[str] = mapped_column(String(64), unique=True)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dataset_version: Mapped[str] = mapped_column(String(64))
    feature_list: Mapped[dict] = mapped_column(JSON, default=dict)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    artifact_path: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class PolicyConfig(Base):
    __tablename__ = "policy_config"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version: Mapped[str] = mapped_column(String(64), unique=True)
    threshold_low: Mapped[float] = mapped_column(Float)
    threshold_high: Mapped[float] = mapped_column(Float)
    high_risk_action: Mapped[str] = mapped_column(String(16), default="BLOCK")
    block_amount_min: Mapped[float] = mapped_column(Float, default=25000)
    cost_assumptions: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (UniqueConstraint("transaction_id", name="uq_assessments_transaction_id"),)

    assessment_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[str] = mapped_column(String(64), index=True)
    merchant_id: Mapped[str] = mapped_column(String(64), index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    risk_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(16), index=True)
    decision: Mapped[str] = mapped_column(String(16), index=True)
    model_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_version: Mapped[str] = mapped_column(String(64), index=True)
    policy_version: Mapped[str] = mapped_column(String(64))
    top_factors: Mapped[list] = mapped_column(JSON, default=list)
    explanation_status: Mapped[str] = mapped_column(String(16), default="ok")
    feature_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    feature_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    degraded: Mapped[bool] = mapped_column(Boolean, default=False)
    degraded_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    processing_status: Mapped[str] = mapped_column(String(16), default="completed")
    review_status: Mapped[str] = mapped_column(String(24), default="none")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("assessments.assessment_id"), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(64), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    model_version: Mapped[str | None] = mapped_column(String(64), index=True)
    policy_version: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class ReviewAction(Base):
    __tablename__ = "review_actions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assessment_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("assessments.assessment_id"))
    action: Mapped[str] = mapped_column(String(32))
    actor: Mapped[str] = mapped_column(String(64), default="demo-reviewer")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
