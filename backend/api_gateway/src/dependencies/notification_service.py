"""Dependency injection for NotificationService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.notification_service import NotificationService


def get_notification_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> NotificationService:
    return NotificationService(collection=db_collections)
