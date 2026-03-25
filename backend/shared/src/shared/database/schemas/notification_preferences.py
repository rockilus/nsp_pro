"""MongoDB schema for NotificationPreferences documents."""

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.notification_preferences import (
    NotificationPreferences,
)


class NotificationPreferencesSchema(DocumentBaseSchema):
    """MongoDB document representation of NotificationPreferences."""

    user_id: str
    email_enabled: bool = True
    email_schedule_published: bool = True
    email_swap_requests: bool = True
    email_request_decisions: bool = True
    email_assignment_changes: bool = True

    def to_core(self) -> NotificationPreferences:
        return NotificationPreferences(
            user_id=self.user_id,
            email_enabled=self.email_enabled,
            email_schedule_published=self.email_schedule_published,
            email_swap_requests=self.email_swap_requests,
            email_request_decisions=self.email_request_decisions,
            email_assignment_changes=self.email_assignment_changes,
        )

    @classmethod
    def from_core(
        cls, prefs: NotificationPreferences
    ) -> "NotificationPreferencesSchema":
        return cls(
            id=None,
            user_id=prefs.user_id,
            email_enabled=prefs.email_enabled,
            email_schedule_published=prefs.email_schedule_published,
            email_swap_requests=prefs.email_swap_requests,
            email_request_decisions=prefs.email_request_decisions,
            email_assignment_changes=prefs.email_assignment_changes,
        )
