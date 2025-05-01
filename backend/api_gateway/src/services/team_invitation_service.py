import secrets
from datetime import datetime, timedelta, timezone

from shared.schemas.core import (
    INVITE_TYPE_ROLE_MAP,
    TeamInvitation,
    TeamInvitationStatus,
    TeamInvitationType,
    TeamMembership,
    TeamMembershipRole,
    User,
)

from src.services.base_service import BaseService
from src.services.team_membership_service import TeamMembershipService


class TeamInvitationService(BaseService):
    def __init__(
        self,
        collection,
        team_membership_service: TeamMembershipService,
    ):
        super().__init__(collection)
        self.team_membership_service = team_membership_service

    async def create_team_invitation(
        self, invitation: TeamInvitation
    ) -> TeamInvitation | None:
        existing_invitations = (
            self.collection.team_invitation_db.get_invitations_by_team_id(
                team_id=invitation.team_id,
            )
        )
        if any(
            existing_invitation
            for existing_invitation in existing_invitations
            if existing_invitation.email == invitation.email
            and existing_invitation.status == TeamInvitationStatus.PENDING
            and existing_invitation.type == invitation.type
        ):
            return None
        invitation.token = secrets.token_urlsafe(32)
        invitation.status = TeamInvitationStatus.PENDING
        invitation.created_at = datetime.now(tz=timezone.utc)
        invitation.expires_at = datetime.now(tz=timezone.utc) + timedelta(days=7)
        self.send_invitation_email(invitation)
        invitation.last_sent_at = datetime.now(tz=timezone.utc)
        invitation = self.collection.team_invitation_db.create_invitation(
            invitation=invitation
        )
        return invitation

    def get_team_invitations(self, team_id: str) -> list[TeamInvitation]:
        return self.collection.team_invitation_db.get_invitations_by_team_id(
            team_id=team_id,
        )

    def get_pending_invitations_by_email(self, email: str) -> list[TeamInvitation]:
        return self.collection.team_invitation_db.get_pending_invitations_by_email(
            email=email,
        )

    # pylint: disable=too-many-return-statements
    async def accept_team_invitation(self, user_id: str, token: str) -> bool:
        invitation = self.collection.team_invitation_db.get_invitation_by_token(
            token=token,
        )
        user = self.collection.user_db.get_user_by_id(user_id=user_id)
        if not invitation or not user:
            return False
        if not self.validate_invitation(invitation=invitation, user=user):
            return False
        membership_role_value = INVITE_TYPE_ROLE_MAP.get(invitation.type.value, None)
        if not membership_role_value:
            return False
        membership_role: TeamMembershipRole | None = None
        try:
            membership_role = TeamMembershipRole(membership_role_value)
        except ValueError:
            return False
        if membership_role is None:
            return False
        membership = TeamMembership(
            id="",
            user_id=user.id,
            team_id=invitation.team_id,
            roles=[membership_role],
        )
        await self.team_membership_service.create_team_membership(membership)
        if invitation.type == TeamInvitationType.MEMBER and invitation.worker_id:
            worker = self.collection.worker_db.get_worker_by_id(
                worker_id=invitation.worker_id,
            )
            if worker:
                worker.user_id = user.id
                self.collection.worker_db.update_worker(worker)
        invitation.status = TeamInvitationStatus.ACCEPTED
        self.collection.team_invitation_db.update_invitation(invitation)
        return True

    def reject_team_invitation(self, user_id: str, token: str) -> bool:
        invitation = self.collection.team_invitation_db.get_invitation_by_token(
            token=token,
        )
        user = self.collection.user_db.get_user_by_id(user_id=user_id)
        if not invitation or not user:
            return False
        if not self.validate_invitation(invitation=invitation, user=user):
            return False
        invitation.status = TeamInvitationStatus.REJECTED
        self.collection.team_invitation_db.update_invitation(invitation)
        return True

    def send_invitation_email(self, invitation: TeamInvitation) -> None:
        if not self.can_resend_invite(invitation):
            return
        # TO COME
        return

    def delete_team_invitation(self, invitation_id: str) -> None:
        self.collection.team_invitation_db.delete_invitation(
            invitation_id=invitation_id
        )

    @staticmethod
    def validate_invitation(invitation: TeamInvitation, user: User) -> bool:
        if invitation.status != TeamInvitationStatus.PENDING:
            return False
        if datetime.now(tz=timezone.utc) > invitation.expires_at:
            return False
        if not user:
            return False
        if user.email != invitation.email:
            return False
        return True

    @staticmethod
    def can_resend_invite(invitation: TeamInvitation) -> bool:
        now = datetime.now(tz=timezone.utc)

        if invitation.last_sent_at is None:
            return True

        elapsed = (now - invitation.last_sent_at).total_seconds()
        return elapsed > 60
