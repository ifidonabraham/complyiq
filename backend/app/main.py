# ===========================
# FastAPI Application Factory & Main Entry Point
# ===========================

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import structlog

from app.core.config import get_settings
from app.db.database import DatabaseManager
from app.api import health, scans

# Configure logging
logging.basicConfig(level=logging.INFO)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

settings = get_settings()


def create_app() -> FastAPI:
    """
    FastAPI application factory.
    Creates and configures the main application instance.
    """

    app = FastAPI(
        title=settings.api_title,
        description=settings.api_description,
        version=settings.api_version,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc):
        logger.error(
            "http_exception",
            status_code=exc.status_code,
            detail=exc.detail,
            path=request.url.path,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail, "status_code": exc.status_code},
        )

    # Startup events
    @app.on_event("startup")
    async def startup_event():
        logger.info("app_startup", environment=settings.environment)
        DatabaseManager.initialize()
        # Initialize database tables (Alembic handles migrations)
        # TODO: Run alembic upgrade head

    # Shutdown events
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("app_shutdown")
        await DatabaseManager.close()

    # Include routers
    app.include_router(health.router)
    app.include_router(scans.router)

    logger.info(
        "app_initialized",
        version=settings.api_version,
        environment=settings.environment,
    )

    return app


# Create application instance
app = create_app()
