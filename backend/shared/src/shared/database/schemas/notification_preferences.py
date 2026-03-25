"""MongoDB schema for NotificationPreferences documents."""

from pydantic import Field

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.notification_preferences import (
    ChannelPreferences,
    NotificationKey,
    NotificationPreferences,
)


class NotificationPreferencesSchema(DocumentBaseSchema):
    """MongoDB document representation of NotificationPreferences."""

    user_id: str
    preferences: dict[str, dict] = Field(default_factory=dict)

    def to_core(self) -> NotificationPreferences:
        valid_keys = {k.value for k in NotificationKey}
        return NotificationPreferences(
            user_id=self.user_id,
            preferences={
                NotificationKey(key): ChannelPreferences(
                    email=ch.get("email", True),
                    in_app=ch.get("in_app", True),
                )
                for key, ch in self.preferences.items()
                if key in valid_keys
            },
        )

    @classmethod
    def from_core(
        cls, prefs: NotificationPreferences
    ) -> "NotificationPreferencesSchema":
        return cls(
            id=None,
            user_id=prefs.user_id,
            preferences={
                key: {"email": ch.email, "in_app": ch.in_app}
                for key, ch in prefs.preferences.items()
            },
        )
