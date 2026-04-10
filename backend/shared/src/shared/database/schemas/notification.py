"""MongoDB schema for Notification documents."""

from datetime import datetime
from typing import Any, Dict, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.notification import Notification, NotificationType


class NotificationSchema(DocumentBaseSchema):
    """MongoDB document representation of a Notification."""

    user_id: str
    team_id: str
    type: str
    event_data: Dict[str, Any]
    read: bool = False
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime] = None
    seen_at: Optional[datetime] = None

    def to_core(self) -> Notification:
        return Notification(
            id=self.id or "",
            user_id=self.user_id,
            team_id=self.team_id,
            type=NotificationType(self.type),
            event_data=self.event_data,
            read=self.read,
            created_at=self.created_at,
            updated_at=self.updated_at,
            read_at=self.read_at,
            seen_at=self.seen_at,
        )

    @classmethod
    def from_core(cls, notification: Notification) -> "NotificationSchema":
        return cls(
            id=notification.id or None,
            user_id=notification.user_id,
            team_id=notification.team_id,
            type=notification.type.value,
            event_data=notification.event_data,
            read=notification.read,
            created_at=notification.created_at,
            updated_at=notification.updated_at,
            read_at=notification.read_at,
            seen_at=notification.seen_at,
        )
