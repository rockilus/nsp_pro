"""Dependencies for Email Queue Service."""

from functools import lru_cache

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.email_queue_service import (
    EmailQueueService,
    create_email_queue_service,
)


@lru_cache(maxsize=1)
def get_email_queue_service_cached(
    collection: DatabaseCollections = Depends(get_db_collections),
) -> EmailQueueService:
    """
    Cached factory for EmailQueueService.
    Creates a single instance and caches it for the application lifetime.
    """
    return create_email_queue_service(collection)


def get_email_queue_service() -> EmailQueueService:
    """
    Dependency injection function for EmailQueueService.
    Returns the cached EmailQueueService instance.
    """
    return get_email_queue_service_cached()
