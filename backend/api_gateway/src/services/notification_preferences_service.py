"""Service for managing per-user notification preferences."""

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core.notification_preferences import (
    NotificationPreferences,
)

from src.services.base_service import BaseService


class NotificationPreferencesService(BaseService):
    """Service for reading and updating notification preferences."""

    def get_or_create(self, user_id: str) -> NotificationPreferences:
        return (
            self.collection.notification_preferences_db.get_or_create_default(
                user_id
            )
        )

    def update(
        self, user_id: str, prefs: NotificationPreferences
    ) -> NotificationPreferences:
        prefs.user_id = user_id  # ensure user_id cannot be spoofed
        return self.collection.notification_preferences_db.update_preferences(
            user_id, prefs
        )
