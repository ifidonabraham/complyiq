# ===========================
# SQLAlchemy ORM Models - Database Schema
# ===========================

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    JSON,
    Index,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class User(Base):
    """
    User account model.
    Stores basic user info, API keys, subscription tier.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    subscription_tier = Column(String(50), default="free")  # free, pro, enterprise
    api_quota_daily = Column(Integer, default=100)  # scans per day
    api_calls_today = Column(Integer, default=0)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    scan_results = relationship(
        "ScanResult", back_populates="user", cascade="all, delete-orphan"
    )


class APIKey(Base):
    """
    API key model for programmatic access.
    Each user can have multiple API keys for different apps/integrations.
    """

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g., "Chrome Extension", "Mobile App"
    is_active = Column(Boolean, default=True, index=True)
    rate_limit_rpm = Column(Integer, default=60)  # requests per minute
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="api_keys")


class ScanResult(Base):
    """
    Stores website scan results.
    Includes trust score, compliance score, detailed findings, and metadata.
    """

    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    domain = Column(String(255), nullable=False, index=True)
    url = Column(String(2048), nullable=False)
    
    # Core Scores (0-100)
    trust_score = Column(Float, nullable=True)  # Technical/security assessment
    compliance_score = Column(Float, nullable=True)  # NDPA/privacy assessment
    complyiq_rating = Column(Float, nullable=True)  # Combined rating (0-100)
    
    # Module 1: Website Scanner Results
    https_grade = Column(String(2), nullable=True)  # A+, A, B, C, D, F
    domain_age_days = Column(Integer, nullable=True)
    dns_records = Column(JSON, nullable=True)  # DNS resolution results
    ssl_certificate = Column(JSON, nullable=True)  # SSL/TLS cert details
    security_headers = Column(JSON, nullable=True)  # X-Frame-Options, CSP, etc
    js_analysis = Column(JSON, nullable=True)  # Third-party scripts, trackers
    phishing_risk = Column(String(50), nullable=True)  # low, medium, high, critical
    
    # Module 2: Data Collection Analysis
    privacy_policy_found = Column(Boolean, default=False)
    privacy_policy_url = Column(String(2048), nullable=True)
    privacy_policy_quality = Column(String(50), nullable=True)  # poor, fair, good, excellent
    consent_banner_found = Column(Boolean, default=False)
    cookies_detected = Column(Integer, default=0)
    tracking_pixels_detected = Column(Integer, default=0)
    sensitive_fields_inventory = Column(JSON, nullable=True)  # BVN, NIN, email inputs detected
    data_processors = Column(JSON, nullable=True)  # Third-party data processors
    
    # NDPA-Specific Findings
    bvn_field_detected = Column(Boolean, default=False)
    nin_field_detected = Column(Boolean, default=False)
    phone_field_detected = Column(Boolean, default=False)
    card_field_detected = Column(Boolean, default=False)
    consent_text_mentions_ndpa = Column(Boolean, default=False)
    
    # Raw Data & Metadata
    full_report = Column(JSON, nullable=True)  # Complete scan report
    scan_status = Column(String(50), default="pending")  # pending, in_progress, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    scan_duration_seconds = Column(Float, nullable=True)

    # Relationships
    user = relationship("User", back_populates="scan_results")

    # Indexes for common queries
    __table_args__ = (
        Index("idx_domain_created", "domain", "created_at"),
        Index("idx_user_created", "user_id", "created_at"),
    )


class AuditLog(Base):
    """
    Audit trail for compliance and security monitoring.
    Tracks all significant events (logins, API calls, scan requests, policy changes).
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # login, scan_request, policy_change
    resource_type = Column(String(100), nullable=True)  # scan_result, api_key
    resource_id = Column(Integer, nullable=True)
    action = Column(String(50), nullable=False)  # create, read, update, delete
    details = Column(JSON, nullable=True)  # Additional context
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    __table_args__ = (
        Index("idx_user_event", "user_id", "event_type"),
        Index("idx_created", "created_at"),
    )
