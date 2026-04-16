# ===========================
# Health Check & System Status Endpoints
# ===========================

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

from app.db.database import get_db
from app.schemas.schemas import HealthCheckSchema
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])

settings = get_settings()


@router.get(
    "/health",
    response_model=HealthCheckSchema,
    summary="Health Check",
    tags=["Health"],
)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    System health check endpoint.
    
    Verifies:
    - Database connectivity
    - Redis connectivity
    - Overall system status
    
    **Response:**
    - status: `ok` or `degraded`
    - database: connection status
    - redis: connection status
    """
    import redis
    from app.core.config import get_settings

    health = {
        "status": "ok",
        "version": settings.api_version,
        "database": "disconnected",
        "redis": "disconnected",
        "celery": "unknown",
    }

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health["database"] = "connected"
        logger.debug("Database health check: OK")
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        health["database"] = "disconnected"
        health["status"] = "degraded"

    # Check Redis
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        r.ping()
        health["redis"] = "connected"
        logger.debug("Redis health check: OK")
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        health["redis"] = "disconnected"
        health["status"] = "degraded"

    return health


@router.get("/", tags=["Health"])
async def root():
    """
    API root endpoint with documentation links.
    """
    return {
        "name": "ComplyIQ",
        "version": settings.api_version,
        "description": settings.api_description,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
