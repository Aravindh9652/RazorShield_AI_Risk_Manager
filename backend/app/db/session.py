"""
Database session and engine management.
PostgreSQL via SQLAlchemy 2.0 and psycopg 3.
Fast timeout configuration for PostgreSQL connection attempts.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str | None = None):
    """
    Creates SQLAlchemy engine connected to PostgreSQL.
    No application-level silent SQLite fallback.
    Uses connect_timeout=1 for fast failure detection when PostgreSQL host is offline.
    """
    settings = get_settings()
    connect_url = url or settings.database_url
    connect_args = {}
    if connect_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif connect_url.startswith("postgresql"):
        connect_args["connect_timeout"] = 1
    return create_engine(connect_url, pool_pre_ping=True, future=True, connect_args=connect_args)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
