"""Dependency injection for NotificationPreferencesService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.notification_preferences_service import (
    NotificationPreferencesService,
)


def get_notification_preferences_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> NotificationPreferencesService:
    return NotificationPreferencesService(collection=db_collections)
