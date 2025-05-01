from datetime import datetime, timezone

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
)


class TeamInvitationSchema(DocumentBaseSchema):
    """Team Invitation schema for validation."""

    team_id: str
    email: str
    worker_id: str
    token: str
    status: str
    created_at: float
    expires_at: float

    def to_core(self) -> TeamInvitation:
        return TeamInvitation(
            id=self.id or "",
            team_id=self.team_id,
            email=self.email,
            worker_id=self.worker_id,
            token=self.token,
            status=TeamInvitationStatus(self.status),
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            expires_at=datetime.fromtimestamp(self.expires_at, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, invitation: TeamInvitation) -> "TeamInvitationSchema":
        return cls(
            id=invitation.id,
            team_id=invitation.team_id,
            email=invitation.email,
            worker_id=invitation.worker_id,
            token=invitation.token,
            status=invitation.status.value,
            created_at=invitation.created_at.timestamp(),
            expires_at=invitation.expires_at.timestamp(),
        )
