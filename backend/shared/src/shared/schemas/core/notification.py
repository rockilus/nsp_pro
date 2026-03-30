"""Notification schemas for NSP Pro."""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, cast

import humps
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    """Type of in-app notification."""

    SCHEDULE_PUBLISHED = "schedule_published"
    NEW_REQUEST = "new_request"
    NEW_SWAP_REQUEST = "new_swap_request"
    SWAP_STATUS_CHANGED = "swap_status_changed"
    REQUEST_STATUS_CHANGED = "request_status_changed"
    ASSIGNMENT_CHANGED = "assignment_changed"
    USER_RECEIVED_TEAM_INVITE = "user_received_team_invite"
    USER_ACCEPTED_TEAM_INVITE = "user_accepted_team_invite"
    USER_REMOVED_FROM_TEAM = "user_removed_from_team"
    USER_LEFT_TEAM = "user_left_team"


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
