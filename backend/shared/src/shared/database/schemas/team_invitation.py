from datetime import datetime, timezone
from typing import Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
    TeamInvitationType,
)


class TeamInvitationSchema(DocumentBaseSchema):
    """Team Invitation schema for validation."""

    team_id: str
    email: str
    type: str
    worker_id: Optional[str] = None
    token: str
    status: str
    created_at: float
    expires_at: float
    last_sent_at: Optional[float] = None

    def to_core(self) -> TeamInvitation:
        return TeamInvitation(
            id=self.id or "",
            team_id=self.team_id,
            email=self.email,
            type=TeamInvitationType(self.type),
            worker_id=self.worker_id or None,
            token=self.token,
            status=TeamInvitationStatus(self.status),
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            expires_at=datetime.fromtimestamp(self.expires_at, tz=timezone.utc),
            last_sent_at=(
                datetime.fromtimestamp(self.last_sent_at, tz=timezone.utc)
                if self.last_sent_at
                else None
            ),
        )

    @classmethod
    def from_core(cls, invitation: TeamInvitation) -> "TeamInvitationSchema":
        return cls(
            id=invitation.id,
            team_id=invitation.team_id,
            email=invitation.email,
            type=invitation.type.value,
            worker_id=invitation.worker_id or None,
            token=invitation.token,
            status=invitation.status.value,
            created_at=invitation.created_at.timestamp(),
            expires_at=invitation.expires_at.timestamp(),
            last_sent_at=(
                invitation.last_sent_at.timestamp() if invitation.last_sent_at else None
            ),
        )
