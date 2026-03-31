"""Notification preferences schemas for NSP Pro."""

from dataclasses import dataclass, field
from enum import StrEnum

from pydantic import BaseModel, Field


class NotificationCategory(StrEnum):
    SCHEDULE = "schedule"
    REQUESTS = "requests"
    ASSIGNMENTS = "assignments"
    TEAM = "team"
    SWAPS = "swaps"


class NotificationKey(StrEnum):
    USER_PUBLISHED_SCHEDULE = "user_published_schedule"
    USER_CREATED_REQUEST = "user_created_request"
    USER_ACCEPTED_REQUEST = "user_accepted_request"
    USER_DENIED_REQUEST = "user_denied_request"
    USER_CREATED_ASSIGNMENT = "user_created_assignment"
    USER_UPDATED_ASSIGNMENT = "user_updated_assignment"
    USER_DELETED_ASSIGNMENT = "user_deleted_assignment"
    USER_RECEIVED_TEAM_INVITE = "user_received_team_invite"
    USER_ACCEPTED_TEAM_INVITE = "user_accepted_team_invite"
    USER_REMOVED_FROM_TEAM = "user_removed_from_team"
    USER_LEFT_TEAM = "user_left_team"
    USER_CREATED_DIRECT_SWAP = "user_created_direct_swap"
    USER_ACCEPTED_DIRECT_SWAP = "user_accepted_direct_swap"
    USER_REFUSED_DIRECT_SWAP = "user_refused_direct_swap"
    USER_CREATED_OPEN_SWAP = "user_created_open_swap"
    USER_BID_OPEN_SWAP = "user_bid_open_swap"
    USER_SELECTED_BID_OPEN_SWAP = "user_selected_bid_open_swap"
    USER_SELECTED_OTHER_BID_OPEN_SWAP = "user_selected_other_bid_open_swap"
    SWAP_READY_FOR_REVIEW = "swap_ready_for_review"
    USER_VALIDATED_SWAP = "user_validated_swap"
    USER_DENIED_SWAP = "user_denied_swap"
    USER_REVERSED_SWAP = "user_reversed_swap"
    CAMPAIGN_REQUEST_DEADLINE_SET = "campaign_request_deadline_set"
    CAMPAIGN_REQUEST_DEADLINE_REMINDER = "campaign_request_deadline_reminder"
    CAMPAIGN_REQUEST_DEADLINE_EXTENDED = "campaign_request_deadline_extended"


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
    NotificationKey.USER_ACCEPTED_REQUEST: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
    ),
    NotificationKey.USER_DENIED_REQUEST: NotificationKeyMeta(
        category=NotificationCategory.REQUESTS,
    ),
    NotificationKey.USER_CREATED_ASSIGNMENT: NotificationKeyMeta(
        category=NotificationCategory.ASSIGNMENTS,
    ),
    NotificationKey.USER_UPDATED_ASSIGNMENT: NotificationKeyMeta(
        category=NotificationCategory.ASSIGNMENTS,
    ),
    NotificationKey.USER_DELETED_ASSIGNMENT: NotificationKeyMeta(
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
    NotificationKey.USER_CREATED_DIRECT_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_ACCEPTED_DIRECT_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_REFUSED_DIRECT_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_CREATED_OPEN_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_BID_OPEN_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_SELECTED_BID_OPEN_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_SELECTED_OTHER_BID_OPEN_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.SWAP_READY_FOR_REVIEW: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
        visible_to=frozenset({"manager", "owner"}),
    ),
    NotificationKey.USER_VALIDATED_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_DENIED_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.USER_REVERSED_SWAP: NotificationKeyMeta(
        category=NotificationCategory.SWAPS,
    ),
    NotificationKey.CAMPAIGN_REQUEST_DEADLINE_SET: NotificationKeyMeta(
        category=NotificationCategory.SCHEDULE,
        visible_to=frozenset({"member"}),
    ),
    NotificationKey.CAMPAIGN_REQUEST_DEADLINE_REMINDER: NotificationKeyMeta(
        category=NotificationCategory.SCHEDULE,
        visible_to=frozenset({"member"}),
    ),
    NotificationKey.CAMPAIGN_REQUEST_DEADLINE_EXTENDED: NotificationKeyMeta(
        category=NotificationCategory.SCHEDULE,
        visible_to=frozenset({"member"}),
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
