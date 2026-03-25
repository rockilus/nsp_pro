"""Notification service for creating and managing user notifications."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from loguru import logger
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core.notification import Notification, NotificationType

from src.services.base_service import BaseService


class NotificationService(BaseService):
    """Service for managing in-app notifications."""

    def create_notification(
        self,
        user_id: str,
        team_id: str,
        notification_type: NotificationType,
        event_data: Dict[str, Any],
    ) -> Notification:
        """Create a notification in DB. Fire-and-forget — does not raise."""
        try:
            now = datetime.now(timezone.utc)
            notification = Notification(
                id="",
                user_id=user_id,
                team_id=team_id,
                type=notification_type,
                event_data=event_data,
                read=False,
                created_at=now,
                updated_at=now,
            )
            return self.collection.notification_db.create_notification(
                notification
            )
        except Exception as e:
            logger.error(
                f"Failed to create notification for user {user_id}: {e}"
            )
            raise

    def get_user_notifications(
        self, user_id: str, limit: int = 20, skip: int = 0
    ) -> Dict[str, Any]:
        """Return paginated notifications + unread count."""
        notifications = self.collection.notification_db.get_by_user_id(
            user_id, limit=limit, skip=skip
        )
        unread_count = self.collection.notification_db.get_unread_count(
            user_id
        )
        return {
            "notifications": notifications,
            "unread_count": unread_count,
        }

    def get_unread_count(self, user_id: str) -> int:
        return self.collection.notification_db.get_unread_count(user_id)

    def mark_read(
        self, notification_id: str, user_id: str
    ) -> Optional[Notification]:
        """Mark a notification as read, verifying ownership."""
        schema = self.collection.notification_db.find_by_id(notification_id)
        if schema is None:
            return None
        if schema.user_id != user_id:
            raise PermissionError("Notification does not belong to this user")
        return self.collection.notification_db.mark_read(notification_id)

    def mark_all_read(self, user_id: str) -> None:
        self.collection.notification_db.mark_all_read(user_id)

    def delete(self, notification_id: str, user_id: str) -> bool:
        """Delete a notification, verifying ownership."""
        schema = self.collection.notification_db.find_by_id(notification_id)
        if schema is None:
            return False
        if schema.user_id != user_id:
            raise PermissionError("Notification does not belong to this user")
        return self.collection.notification_db.delete_notification(
            notification_id
        )
