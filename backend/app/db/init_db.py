from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine
from app.core.logging import get_logger

# Import all models so they are registered with Base.metadata
import app.models.scan  # noqa: F401
import app.models.resource  # noqa: F401
import app.models.finding  # noqa: F401
import app.models.attack_path  # noqa: F401
import app.models.relationship  # noqa: F401

logger = get_logger(__name__)


async def init_db() -> None:
    logger.info("Initializing database tables")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE scans ADD COLUMN IF NOT EXISTS account_name VARCHAR(255)"))
    logger.info("Database tables initialized successfully")
