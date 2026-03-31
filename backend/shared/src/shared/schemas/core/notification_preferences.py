"""Notification preferences schemas for NSP Pro."""

from dataclasses import dataclass, field
from enum import StrEnum

from pydantic import BaseModel, Field


class NotificationCategory(StrEnum):
    SCHEDULE = "schedule"
    REQUESTS = "requests"
    ASSIGNMENTS = "assignments"
    TEAM = "team"


class NotificationKey(StrEnum):
    USER_PUBLISHED_SCHEDULE = "user_published_schedule"
    USER_CREATED_REQUEST = "user_created_request"
    SWAP_REQUESTS = "swap_requests"
    USER_ACCEPTED_REQUEST = "user_accepted_request"
    USER_DENIED_REQUEST = "user_denied_request"
    ASSIGNMENT_CHANGES = "assignment_changes"
    USER_RECEIVED_TEAM_INVITE = "user_received_team_invite"
    USER_ACCEPTED_TEAM_INVITE = "user_accepted_team_invite"
    USER_REMOVED_FROM_TEAM = "user_removed_from_team"
    USER_LEFT_TEAM = "user_left_team"


@dataclass(frozen=True)
class NotificationKeyMeta:
    category: NotificationCategory
    # Empty frozenset means visible to all roles.
    # Use string literals ("owner"/"member") to avoid circular imports.
    visible_to: frozenset[str] = field(default_factory=frozenset)


NOTIFICATION_REGISTRY: dict[NotificationKey, NotificationKeyMeta] = {
    NotificationKey.USER_PUBLISHED_SCHEDULE: NotificationKeyMeta(
        category=NotificationCategory.SCHEDULE,
    ),
    NotificationKey.USER_CREATED_REQUEST: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
        visible_to=frozenset({"owner"}),
    ),
    NotificationKey.SWAP_REQUESTS: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
    ),
    NotificationKey.USER_ACCEPTED_REQUEST: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
    ),
    NotificationKey.USER_DENIED_REQUEST: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
    ),
    NotificationKey.ASSIGNMENT_CHANGES: NotificationKeyMeta(
        category=NotificationCategory.ASSIGNMENTS,
    ),
    NotificationKey.USER_RECEIVED_TEAM_INVITE: NotificationKeyMeta(
        category=NotificationCategory.TEAM,
    ),
    NotificationKey.USER_ACCEPTED_TEAM_INVITE: NotificationKeyMeta(
        category=NotificationCategory.TEAM,
        visible_to=frozenset({"owner"}),
    ),
    NotificationKey.USER_REMOVED_FROM_TEAM: NotificationKeyMeta(
        category=NotificationCategory.TEAM,
    ),
    NotificationKey.USER_LEFT_TEAM: NotificationKeyMeta(
        category=NotificationCategory.TEAM,
        visible_to=frozenset({"owner"}),
    ),
}


@dataclass
class ChannelPreferences:
    email: bool = True
    in_app: bool = True


@dataclass
class NotificationPreferences:
    """Core domain object for per-user notification preferences."""

    user_id: str
    preferences: dict[NotificationKey, ChannelPreferences] = field(
        default_factory=lambda: {
            k: ChannelPreferences() for k in NotificationKey
        }
    )

    def to_dto(self) -> "NotificationPreferencesDTO":
        return NotificationPreferencesDTO(
            userId=self.user_id,
            preferences={
                key: ChannelPreferencesDTO(email=ch.email, inApp=ch.in_app)
                for key, ch in self.preferences.items()
            },
        )

    @classmethod
    def from_dto(
        cls, dto: "NotificationPreferencesDTO"
    ) -> "NotificationPreferences":
        valid_keys = {k.value for k in NotificationKey}
        return cls(
            user_id=dto.user_id,
            preferences={
                NotificationKey(key): ChannelPreferences(
                    email=ch.email, in_app=ch.in_app
                )
                for key, ch in dto.preferences.items()
                if key in valid_keys
            },
        )


class ChannelPreferencesDTO(BaseModel):
    email: bool = True
    in_app: bool = Field(default=True, alias="inApp")

    model_config = {"populate_by_name": True}


class NotificationPreferencesDTO(BaseModel):
    """Pydantic DTO for NotificationPreferences (camelCase)."""

    user_id: str = Field(..., alias="userId")
    preferences: dict[str, ChannelPreferencesDTO] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}
