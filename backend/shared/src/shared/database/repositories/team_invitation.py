from datetime import datetime, timezone

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.team_invitation import TeamInvitationSchema
from shared.schemas.core.team_invitation import (
    TeamInvitation,
    TeamInvitationStatus,
)
from shared.database.interface import DatabaseInterface


class TeamInvitationRepository(BaseRepository[TeamInvitationSchema]):
    """Repository for team invitation documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(
            database_interface, "team_invitations", TeamInvitationSchema
        )

    def create_invitation(self, invitation: TeamInvitation) -> TeamInvitation:
        """Create a new team invitation."""
        invitation_schema = TeamInvitationSchema.from_core(invitation)
        result = self.create(invitation_schema)
        return result.to_core()

    def get_invitation_by_id(self, invitation_id: str) -> TeamInvitation:
        """Get a team invitation by its ID."""
        invitation = self.find_by_id(invitation_id)
        if not invitation:
            raise Exception(
                f"Team invitation with id {invitation_id} not found"
            )
        return invitation.to_core()

    def get_invitations_by_team_id(self, team_id: str) -> list[TeamInvitation]:
        """Get all team invitations for a specific team."""
        invitations = self.find_all({"team_id": team_id})
        return [invitation.to_core() for invitation in invitations]

    def get_pending_invitations_by_team_id(
        self, team_id: str
    ) -> list[TeamInvitation]:
        """Get all pending team invitations for a specific team that are not expired."""
        current_time = datetime.now(timezone.utc).timestamp()
        invitations = self.find_all(
            {
                "team_id": team_id,
                "status": TeamInvitationStatus.PENDING.value,
                "expires_at": {"$gt": current_time},
            }
        )
        return [invitation.to_core() for invitation in invitations]

    def get_pending_invitations_by_email(
        self, email: str
    ) -> list[TeamInvitation]:
        """Get all pending team invitations for a specific email."""
        current_time = datetime.now(timezone.utc).timestamp()
        invitations = self.find_all(
            {
                "email": email,
                "status": TeamInvitationStatus.PENDING.value,
                "expires_at": {"$gt": current_time},
            }
        )
        return [invitation.to_core() for invitation in invitations]

    def get_pending_invitations_by_team_and_email(
        self, team_id: str, email: str
    ) -> list[TeamInvitation]:
        current_time = datetime.now(timezone.utc).timestamp()
        invitations = self.find_all(
            {
                "team_id": team_id,
                "email": email,
                "status": TeamInvitationStatus.PENDING.value,
                "expires_at": {"$gt": current_time},
            }
        )
        return [invitation.to_core() for invitation in invitations]

    def get_invitation_by_token(self, token: str) -> TeamInvitation | None:
        """Get a team invitation by its token."""
        invitation = self.find_one({"token": token})
        if not invitation:
            return None
        return invitation.to_core()

    def update_invitation(self, invitation: TeamInvitation) -> TeamInvitation:
        """Update a team invitation."""
        invitation_schema = TeamInvitationSchema.from_core(invitation)
        updated_invitation = self.update(invitation_schema)
        if not updated_invitation:
            raise Exception(
                f"Failed to update team invitation with id {invitation.id}"
            )
        return updated_invitation.to_core()

    def delete_invitation(self, invitation_id: str) -> None:
        """Delete a team invitation by its ID."""
        result = self.delete(invitation_id)
        if not result:
            raise Exception(
                f"Team invitation with id {invitation_id} not found or already deleted"
            )
