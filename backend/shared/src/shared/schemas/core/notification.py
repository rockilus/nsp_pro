"""Notification schemas for NSP Pro."""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, cast

import humps
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    """Type of in-app notification."""

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
    # Swap notification types
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


@dataclass
class Notification:
    """Core notification domain object."""

    id: str
    user_id: str
    team_id: str
    type: NotificationType
    event_data: Dict[str, Any]
    read: bool
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime] = None
    seen_at: Optional[datetime] = None

    def to_dto(self) -> "NotificationDTO":
        data = {
            "id": self.id,
            "userId": self.user_id,
            "teamId": self.team_id,
            "type": self.type.value,
            "eventData": self.event_data,
            "read": self.read,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "readAt": self.read_at.isoformat() if self.read_at else None,
            "seenAt": self.seen_at.isoformat() if self.seen_at else None,
        }
        return NotificationDTO(**cast(Dict[str, Any], humps.camelize(data)))

    @classmethod
    def from_dto(cls, dto: "NotificationDTO") -> "Notification":
        return cls(
            id=dto.id or "",
            user_id=dto.user_id,
            team_id=dto.team_id,
            type=NotificationType(dto.type),
            event_data=dto.event_data,
            read=dto.read,
            created_at=dto.created_at,
            updated_at=dto.updated_at,
            read_at=dto.read_at,
            seen_at=dto.seen_at,
        )


@dataclass
class NotificationEvent:
    """Carries all data needed to create notifications for one or more users."""

    notification_type: NotificationType
    user_ids: list[str]
    team_id: str
    event_data: Dict[str, Any]


class NotificationDTO(BaseModel):
    """Pydantic DTO for Notification (camelCase, JSON-serialisable)."""

    id: Optional[str] = Field(default=None, alias="id")
    user_id: str = Field(..., alias="userId")
    team_id: str = Field(..., alias="teamId")
    type: str = Field(..., alias="type")
    event_data: Dict[str, Any] = Field(..., alias="eventData")
    read: bool = Field(default=False, alias="read")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )
    read_at: Optional[datetime] = Field(default=None, alias="readAt")
    seen_at: Optional[datetime] = Field(default=None, alias="seenAt")

    model_config = {"populate_by_name": True}
