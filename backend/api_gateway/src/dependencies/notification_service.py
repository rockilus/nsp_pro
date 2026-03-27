"""Dependency injection for NotificationService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.email_queue_service import get_email_queue_service
from src.services.email_queue_service import EmailQueueService
from src.services.notification_service import NotificationService


def get_notification_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    email_queue_service: EmailQueueService = Depends(get_email_queue_service),
) -> NotificationService:
    return NotificationService(
        collection=db_collections,
        email_queue_service=email_queue_service,
    )
