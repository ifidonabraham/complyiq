# ===========================
# Database Connection & Session Management
# ===========================

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """
    Manages async database connections and session lifecycle.
    Uses SQLAlchemy 2.0 with asyncpg for high-performance async database access.
    """

    _engine = None
    _async_session_maker = None

    @classmethod
    def initialize(cls):
        """
        Initialize database engine and session maker.
        Called once at application startup.
        """
        settings = get_settings()

        # Convert postgresql:// to postgresql+asyncpg:// for async support
        async_database_url = settings.database_url.replace(
            "postgresql://", "postgresql+asyncpg://"
        )

        cls._engine = create_async_engine(
            async_database_url,
            echo=settings.sqlalchemy_echo,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,   # Recycle connections every hour
        )

        cls._async_session_maker = async_sessionmaker(
            cls._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )

        logger.info("Database engine initialized: %s", async_database_url)

    @classmethod
    async def get_session(cls) -> AsyncSession:
        """
        Get an async database session.
        Should be used as a dependency in FastAPI endpoints.
        """
        if cls._async_session_maker is None:
            cls.initialize()

        async with cls._async_session_maker() as session:
            yield session

    @classmethod
    async def close(cls):
        """
        Properly close all connections.
        Called at application shutdown.
        """
        if cls._engine:
            await cls._engine.dispose()
            logger.info("Database connections closed")


# Declarative base for all SQLAlchemy models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency for database session.
    Usage: async def my_endpoint(db: AsyncSession = Depends(get_db)):
    """
    return DatabaseManager.get_session()
