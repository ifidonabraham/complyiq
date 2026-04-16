# ===========================
# Core API Endpoints - Website Scanning
# ===========================

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone
import logging

from app.db.database import get_db
from app.models.models import ScanResult, User
from app.schemas.schemas import (
    ScanRequestSchema,
    ScanResultDetailSchema,
    ScanResultListSchema,
    ErrorResponseSchema,
)
from app.tasks.celery_app import scan_website_task
from app.core.security import SecurityManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/scans", tags=["Scanning"])


@router.post(
    "/check",
    response_model=ScanResultDetailSchema,
    summary="Initiate Website Scan",
    responses={
        200: {"description": "Scan initiated successfully"},
        400: {"model": ErrorResponseSchema, "description": "Invalid URL"},
        429: {"model": ErrorResponseSchema, "description": "Rate limit exceeded"},
    },
)
async def check_website(
    request: ScanRequestSchema,
    db: AsyncSession = Depends(get_db),
    api_key: str = Query(None, description="API key for authentication"),
):
    """
    Initiate a website scan for trust and compliance assessment.
    
    This endpoint:
    1. Validates the URL
    2. Creates a ScanResult record (status: pending)
    3. Queues an async Celery task (Module 1 + Module 2)
    4. Returns immediately with scan ID
    
    The actual scanning happens asynchronously. Poll `/scans/{scan_id}` to get results.
    
    **Example Request:**
    ```bash
    curl -X POST "http://localhost:8000/api/v1/scans/check?api_key=your-key" \\
      -H "Content-Type: application/json" \\
      -d '{"url": "https://example.com"}'
    ```
    
    **Response:**
    ```json
    {
      "id": 42,
      "domain": "example.com",
      "url": "https://example.com",
      "complyiq_rating": null,
      "scan_status": "pending",
      "created_at": "2026-04-16T10:30:00Z"
    }
    ```
    """
    # TODO: Implement API key validation & rate limiting
    # TODO: Extract domain from URL
    # TODO: Check cache (Redis) for recent scan results

    # Validate URL format
    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://",
        )

    # Extract domain
    from urllib.parse import urlparse

    parsed = urlparse(request.url)
    domain = parsed.netloc

    try:
        # Create ScanResult record
        scan_result = ScanResult(
            domain=domain,
            url=request.url,
            user_id=None,  # TODO: Get from API key
            scan_status="pending",
            created_at=datetime.now(timezone.utc),
        )
        db.add(scan_result)
        await db.flush()
        await db.commit()
        await db.refresh(scan_result)

        logger.info(f"Created scan record {scan_result.id} for {domain}")

        # Queue async Celery task
        task_result = scan_website_task.delay(scan_result.id, request.url)
        logger.info(f"Queued scan task {task_result.id} for scan_id {scan_result.id}")

        return ScanResultDetailSchema.from_orm(scan_result)

    except Exception as e:
        logger.error(f"Failed to create scan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate scan",
        )


@router.get(
    "/{scan_id}",
    response_model=ScanResultDetailSchema,
    summary="Get Scan Results",
    responses={
        200: {"description": "Scan results retrieved successfully"},
        404: {"model": ErrorResponseSchema, "description": "Scan not found"},
    },
)
async def get_scan_result(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve scan results by ID.
    
    **Scan Status Values:**
    - `pending`: Scan queued, not yet started
    - `in_progress`: Currently scanning
    - `completed`: Scan finished, results available
    - `failed`: Scan encountered an error
    
    **Example Request:**
    ```bash
    curl http://localhost:8000/api/v1/scans/42
    ```
    """
    query = select(ScanResult).where(ScanResult.id == scan_id)
    result = await db.execute(query)
    scan = result.scalar_one_or_none()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan {scan_id} not found",
        )

    return ScanResultDetailSchema.from_orm(scan)


@router.get(
    "", response_model=list[ScanResultListSchema], summary="List User Scans"
)
async def list_scans(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List recent scans (paginated).
    
    **Example Request:**
    ```bash
    curl "http://localhost:8000/api/v1/scans?limit=10&offset=0"
    ```
    """
    query = (
        select(ScanResult)
        .order_by(desc(ScanResult.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    scans = result.scalars().all()

    return [ScanResultListSchema.from_orm(scan) for scan in scans]


@router.get(
    "/domain/{domain}",
    response_model=list[ScanResultListSchema],
    summary="Get Scan History for Domain",
)
async def get_domain_history(
    domain: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
):
    """
    Get all previous scans for a specific domain.
    
    **Example Request:**
    ```bash
    curl http://localhost:8000/api/v1/scans/domain/example.com
    ```
    """
    query = (
        select(ScanResult)
        .where(ScanResult.domain == domain)
        .order_by(desc(ScanResult.created_at))
        .limit(limit)
    )
    result = await db.execute(query)
    scans = result.scalars().all()

    return [ScanResultListSchema.from_orm(scan) for scan in scans]
