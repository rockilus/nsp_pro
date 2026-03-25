"""Dependency injection for swap service."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.notification_service import get_notification_service
from src.services.notification_service import NotificationService
from src.services.replacement_service import ReplacementService
from src.services.swap_service import SwapService


def get_replacement_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ReplacementService:
    return ReplacementService(db_collections)


def get_swap_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    replacement_service: ReplacementService = Depends(get_replacement_service),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> SwapService:
    return SwapService(
        db_collections, replacement_service, notification_service
    )
