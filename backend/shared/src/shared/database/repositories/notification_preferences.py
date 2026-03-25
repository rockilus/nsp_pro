"""Repository for NotificationPreferences documents."""

from datetime import datetime, timezone

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.notification_preferences import (
    NotificationPreferencesSchema,
)
from shared.schemas.core.notification_preferences import (
    NotificationPreferences,
)


class NotificationPreferencesRepository(
    BaseRepository[NotificationPreferencesSchema]
):
    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface,
            "notification_preferences",
            NotificationPreferencesSchema,
        )

    def get_or_create_default(self, user_id: str) -> NotificationPreferences:
        schema = self.find_one({"user_id": user_id})
        if schema is None:
            default = NotificationPreferences(user_id=user_id)
            schema = NotificationPreferencesSchema.from_core(default)
            schema = self.create(schema)
        return schema.to_core()

    def update_preferences(
        self, user_id: str, prefs: NotificationPreferences
    ) -> NotificationPreferences:
        schema = self.find_one({"user_id": user_id})
        if schema is None:
            new_schema = NotificationPreferencesSchema.from_core(prefs)
            created = self.create(new_schema)
            return created.to_core()
        schema.email_enabled = prefs.email_enabled
        schema.email_schedule_published = prefs.email_schedule_published
        schema.email_swap_requests = prefs.email_swap_requests
        schema.email_request_decisions = prefs.email_request_decisions
        schema.email_assignment_changes = prefs.email_assignment_changes
        updated = self.update(schema)
        return updated.to_core() if updated else prefs
