# ===========================
# Core Configuration Module
# ===========================

from pydantic_settings import BaseSettings
from typing import Literal
from functools import lru_cache


class Settings(BaseSettings):
    """
    Central configuration for ComplyIQ backend.
    Uses environment variables with Pydantic v2 validation.
    Supports development, staging, and production environments.
    """

    # API Configuration
    api_title: str = "ComplyIQ"
    api_version: str = "1.0.0"
    api_description: str = "Privacy & Compliance Intelligence Platform"
    debug: bool = False

    # Database
    database_url: str = "postgresql://complyiq:SecurePass2026!@localhost/complyiq_db"
    sqlalchemy_echo: bool = False

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 86400  # 24 hours in seconds

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # JWT Security
    secret_key: str = "your-super-secret-key-min-32-chars-required"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Rate Limiting (per API key)
    rate_limit_requests: int = 10
    rate_limit_period: int = 60  # seconds

    # OpenAI Configuration (for privacy policy analysis)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Scanning Configuration
    playwright_headless: bool = True
    playwright_timeout: int = 30000  # milliseconds
    max_policy_length: int = 100000  # characters

    # NDPA Compliance (Nigeria-specific)
    ndpa_enforcement: bool = True
    bvn_pattern_check: bool = True
    nin_pattern_check: bool = True

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_format: Literal["json", "text"] = "json"

    # Deployment Environment
    environment: Literal["development", "staging", "production"] = "development"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """
    Singleton instance of Settings.
    Cache ensures only one instance is created throughout the app lifecycle.
    """
    return Settings()
