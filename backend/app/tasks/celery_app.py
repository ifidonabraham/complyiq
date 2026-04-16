# ===========================
# Celery Tasks Configuration & Worker Tasks
# ===========================
# Orchestrates async scanning operations using Celery + Redis

from celery import Celery, shared_task
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

# Initialize Celery app
celery_app = Celery(
    "complyiq",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60 * 60,  # 1 hour hard limit
    task_soft_time_limit=55 * 60,  # 55 min soft limit
    result_expires=86400,  # Results kept for 24 hours
)


@shared_task(bind=True, max_retries=2)
def scan_website_task(
    self, scan_id: int, url: str, user_id: int = None
):
    """
    Async task: Execute full website scan (Module 1 + Module 2 combined).
    
    Orchestrates:
    1. Website Scanner (technical security assessment)
    2. Data Collection Analyzer (privacy compliance assessment)
    3. Stores results in database
    4. Computes combined ComplyIQ Rating
    
    Args:
        scan_id: ID of ScanResult record
        url: URL to scan
        user_id: User who requested the scan (for audit logging)
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.db.database import DatabaseManager
    from app.models.models import ScanResult
    from app.services.website_scanner import WebsiteScannerService
    from app.services.data_collection_analyzer import DataCollectionAnalyzerService
    from datetime import datetime, timezone
    import asyncio

    logger.info(f"[Task] Starting scan for URL: {url} (Scan ID: {scan_id})")

    try:
        # Initialize services
        website_scanner = WebsiteScannerService()
        data_analyzer = DataCollectionAnalyzerService()

        # Run both scanners concurrently
        async def run_scans():
            trust_result = await website_scanner.scan_website(url)
            compliance_result = await data_analyzer.analyze_data_collection(url)
            return trust_result, compliance_result

        # Execute async operations
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            trust_result, compliance_result = loop.run_until_complete(run_scans())
        finally:
            loop.close()

        # Extract scores
        trust_score = trust_result.get("trust_score", 50.0)
        compliance_score = compliance_result.get("compliance_score", 50.0)

        # Compute combined ComplyIQ Rating (weighted average: 50/50)
        complyiq_rating = (trust_score * 0.5) + (compliance_score * 0.5)

        # Update database
        async def update_database():
            async with DatabaseManager._async_session_maker() as session:
                scan = await session.get(ScanResult, scan_id)
                if scan:
                    # Module 1 results
                    scan.https_grade = trust_result.get("https_grade")
                    scan.domain_age_days = trust_result.get("domain_age_days")
                    scan.phishing_risk = trust_result.get("phishing_risk")
                    scan.ssl_certificate = trust_result.get("ssl_certificate")
                    scan.security_headers = trust_result.get("security_headers")
                    scan.js_analysis = trust_result.get("js_analysis")
                    scan.dns_records = trust_result.get("dns_records")
                    scan.trust_score = trust_score

                    # Module 2 results
                    scan.privacy_policy_found = compliance_result.get(
                        "privacy_policy_found"
                    )
                    scan.privacy_policy_url = compliance_result.get(
                        "privacy_policy_url"
                    )
                    scan.privacy_policy_quality = compliance_result.get(
                        "privacy_policy_quality"
                    )
                    scan.consent_banner_found = compliance_result.get(
                        "consent_banner_found"
                    )
                    scan.cookies_detected = compliance_result.get("cookies_detected", 0)
                    scan.tracking_pixels_detected = compliance_result.get(
                        "tracking_pixels_detected", 0
                    )
                    scan.sensitive_fields_inventory = compliance_result.get(
                        "sensitive_fields_inventory"
                    )
                    scan.data_processors = compliance_result.get("data_processors")
                    scan.compliance_score = compliance_score

                    # NDPA-specific findings
                    ndpa = compliance_result.get("ndpa_compliance", {})
                    scan.bvn_field_detected = bool(
                        compliance_result.get("sensitive_fields_inventory", {}).get("bvn")
                    )
                    scan.nin_field_detected = bool(
                        compliance_result.get("sensitive_fields_inventory", {}).get("nin")
                    )
                    scan.phone_field_detected = bool(
                        compliance_result.get("sensitive_fields_inventory", {}).get(
                            "phone"
                        )
                    )
                    scan.card_field_detected = bool(
                        compliance_result.get("sensitive_fields_inventory", {}).get("card")
                    )
                    scan.consent_text_mentions_ndpa = ndpa.get("consent_text_ndpa_aware", False)

                    # Combined score
                    scan.complyiq_rating = complyiq_rating

                    # Full report (for API transparency)
                    scan.full_report = {
                        "trust_analysis": trust_result,
                        "compliance_analysis": compliance_result,
                    }

                    # Mark as complete
                    scan.scan_status = "completed"
                    scan.completed_at = datetime.now(timezone.utc)
                    import time
                    scan_duration = self.request.started - scan.created_at.timestamp()
                    scan.scan_duration_seconds = scan_duration if scan_duration > 0 else None

                    await session.commit()
                    logger.info(
                        f"[Task] Scan {scan_id} completed. ComplyIQ Rating: {complyiq_rating}"
                    )

        asyncio.run(update_database())

    except Exception as exc:
        logger.error(f"[Task] Scan {scan_id} failed: {str(exc)}")
        
        # Mark scan as failed
        async def mark_failed():
            async with DatabaseManager._async_session_maker() as session:
                scan = await session.get(ScanResult, scan_id)
                if scan:
                    scan.scan_status = "failed"
                    scan.error_message = str(exc)
                    await session.commit()

        asyncio.run(mark_failed())

        # Retry
        if self.request.retries < self.max_retries:
            logger.info(f"[Task] Retrying scan {scan_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds
        else:
            logger.error(f"[Task] Scan {scan_id} failed permanently after {self.max_retries} retries")
            return {"status": "failed", "scan_id": scan_id}

    return {"status": "success", "scan_id": scan_id, "rating": complyiq_rating}
