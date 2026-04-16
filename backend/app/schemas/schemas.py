# ===========================
# Pydantic Response Schemas (Data Validation & Documentation)
# ===========================

from pydantic import BaseModel, Field, EmailStr, HttpUrl
from typing import Optional, Any
from datetime import datetime


class ScanRequestSchema(BaseModel):
    """Request model for initiating a website scan."""

    url: str = Field(..., description="Full URL to scan (e.g., https://example.com)")
    domain: Optional[str] = Field(None, description="Extracted domain (auto-populated)")
    priority: Optional[str] = Field(
        "normal", description="Scan priority: low, normal, high"
    )


class TrustScoreBreakdownSchema(BaseModel):
    """Trust score components and reasoning."""

    https_grade: Optional[str] = Field(None, description="SSL/TLS grade: A+, A, B, etc")
    domain_age_risk: Optional[float] = Field(
        None, description="Risk score based on domain age"
    )
    phishing_risk: Optional[str] = Field(
        None, description="Phishing risk level: low, medium, high, critical"
    )
    tracker_count: Optional[int] = Field(None, description="Number of trackers detected")
    overall_score: Optional[float] = Field(
        None, description="Final trust score (0-100)", ge=0, le=100
    )


class ComplianceScoreBreakdownSchema(BaseModel):
    """Compliance score components (NDPA focus)."""

    privacy_policy_found: bool = Field(..., description="Privacy policy exists")
    privacy_policy_quality: Optional[str] = Field(
        None, description="Policy quality: poor, fair, good, excellent"
    )
    consent_banner_present: bool = Field(..., description="Consent banner detected")
    ndpa_compliance_indicators: Optional[dict] = Field(
        None, description="NDPA-specific indicators (BVN, NIN mention, etc)"
    )
    sensitive_data_fields: Optional[list[str]] = Field(
        None, description="Detected sensitive fields (BVN, NIN, phone, card)"
    )
    overall_score: Optional[float] = Field(
        None, description="Final compliance score (0-100)", ge=0, le=100
    )


class ScanResultDetailSchema(BaseModel):
    """Full scan result response."""

    id: int
    domain: str
    url: str
    
    # Scores
    trust_score: Optional[float] = Field(None, ge=0, le=100)
    compliance_score: Optional[float] = Field(None, ge=0, le=100)
    complyiq_rating: Optional[float] = Field(None, ge=0, le=100, description="Combined rating")
    
    # Module 1: Technical Security
    https_grade: Optional[str]
    domain_age_days: Optional[int]
    phishing_risk: Optional[str]
    js_analysis: Optional[dict] = Field(None, description="Third-party scripts and trackers")
    
    # Module 2: Privacy & Compliance
    privacy_policy_found: bool
    privacy_policy_url: Optional[str]
    consent_banner_found: bool
    cookies_detected: int
    tracking_pixels_detected: int
    
    # NDPA-Specific
    bvn_field_detected: bool
    nin_field_detected: bool
    phone_field_detected: bool
    card_field_detected: bool
    
    # Metadata
    scan_status: str
    created_at: datetime
    completed_at: Optional[datetime]
    scan_duration_seconds: Optional[float]
    
    class Config:
        from_attributes = True


class ScanResultListSchema(BaseModel):
    """Lightweight scan result for list views."""

    id: int
    domain: str
    complyiq_rating: Optional[float] = Field(None, description="Combined rating (0-100)")
    scan_status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class APIKeyResponseSchema(BaseModel):
    """API key response (never expose full key after creation)."""

    id: int
    name: str
    key_prefix: str = Field(..., description="First 8 chars of key")
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class ErrorResponseSchema(BaseModel):
    """Standard error response."""

    error: str
    detail: Optional[str] = None
    status_code: int


class HealthCheckSchema(BaseModel):
    """Health check response."""

    status: str = Field(..., description="ok or degraded")
    version: str
    database: str = Field(..., description="Database connection status")
    redis: str = Field(..., description="Redis connection status")
    celery: Optional[str] = Field(None, description="Celery worker status")
