"""Application configuration using pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "Invoicing System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # API
    API_PREFIX: str = "/api"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/invoicing"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Email Settings
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM_ADDRESS: EmailStr = "no-reply@example.com"
    EMAIL_FROM_NAME: str = "Invoicing System"
    EMAIL_REPLY_TO: EmailStr = "support@example.com"

    # Email Queue Settings
    EMAIL_MAX_RETRIES: int = 5
    EMAIL_RETRY_DELAY_SECONDS: int = 60
    EMAIL_RETRY_BACKOFF_MULTIPLIER: float = 2.0

    # PDF Storage
    PDF_STORAGE_PATH: str = "./storage/pdfs"
    PDF_BASE_URL: str = "http://localhost:8000/storage/pdfs"

    # Invoice View Token
    INVOICE_VIEW_TOKEN_EXPIRE_HOURS: int = 72
    INVOICE_VIEW_BASE_URL: str = "http://localhost:8000/invoice-view"

    # Payment Providers
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    MONTONIO_ACCESS_KEY: str = ""
    MONTONIO_SECRET_KEY: str = ""
    MONTONIO_WEBHOOK_SECRET: str = ""

    # VAT Configuration (Estonia defaults)
    DEFAULT_VAT_RATE: int = 22
    VAT_RATES: list[int] = [0, 9, 22]

    # Reminder Settings
    DEFAULT_REMINDER_DAYS: list[int] = [7, 14, 30]  # Days after due date

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @field_validator("VAT_RATES", mode="before")
    @classmethod
    def parse_vat_rates(cls, v):
        if isinstance(v, str):
            return [int(x.strip()) for x in v.split(",")]
        return v

    @field_validator("DEFAULT_REMINDER_DAYS", mode="before")
    @classmethod
    def parse_reminder_days(cls, v):
        if isinstance(v, str):
            return [int(x.strip()) for x in v.split(",")]
        return v


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
