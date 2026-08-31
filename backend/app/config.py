from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ROOT / ".env"), extra="ignore")

    app_name: str = "RazorShield"
    app_env: str = "development"
    log_level: str = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    database_url: str = "postgresql+psycopg://razorshield:razorshield_dev_only@localhost:5432/razorshield"
    model_dir: str = str(ROOT / "models")
    artifacts_dir: str = str(ROOT / "artifacts")
    active_model_version: str = "risk-model-v1"
    policy_version: str = "policy-v1"
    high_risk_action: str = "BLOCK"
    block_amount_min: float = 25000
    cost_fraud_loss_multiplier: float = 1.0
    cost_review: float = 120
    cost_customer_friction: float = 80
    cost_blocked_legitimate: float = 400
    demo_seed: int = 42

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
