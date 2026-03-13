import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from models import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./data/claims.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _get_existing_columns(connection, table_name):
    result = connection.exec_driver_sql(f"PRAGMA table_info({table_name})")
    return {row[1] for row in result.fetchall()}


def _ensure_sqlite_schema():
    """Apply additive schema fixes for older local SQLite databases."""
    with engine.begin() as connection:
        if "sqlite" not in str(engine.url):
            return

        users_columns = _get_existing_columns(connection, "users")
        if "role" not in users_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'patient'")
        if "status" not in users_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'pending'")
        if "is_active" not in users_columns:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 0")

        claims_columns = _get_existing_columns(connection, "claims")
        if "description" not in claims_columns:
            connection.exec_driver_sql("ALTER TABLE claims ADD COLUMN description VARCHAR")
        if "admin_comment" not in claims_columns:
            connection.exec_driver_sql("ALTER TABLE claims ADD COLUMN admin_comment VARCHAR")

        documents_columns = _get_existing_columns(connection, "documents")
        if "status" not in documents_columns:
            connection.exec_driver_sql("ALTER TABLE documents ADD COLUMN status VARCHAR DEFAULT 'processing'")

def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
