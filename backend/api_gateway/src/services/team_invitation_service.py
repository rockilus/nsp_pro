import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from shared.schemas.core import (
    INVITE_TYPE_ROLE_MAP,
    EnrichedTeamInvitation,
    MembershipForTeamWithMembership,
    Team,
    TeamInvitation,
    TeamInvitationStatus,
    TeamInvitationType,
    TeamMembership,
    TeamMembershipRole,
    TeamWithMembership,
    User,
)

from src.config import config
from src.services.base_service import BaseService
from src.services.email_queue_service import EmailQueueService
from src.services.team_membership_service import TeamMembershipService


class TeamInvitationService(BaseService):
    def __init__(
        self,
        collection,
        team_membership_service: TeamMembershipService,
        email_queue_service: EmailQueueService | None = None,
    ):
        super().__init__(collection)
        self.team_membership_service = team_membership_service
        self.email_queue_service = email_queue_service

    async def create_team_invitation(
        self, invitation: TeamInvitation, sender_id: str
    ) -> TeamInvitation | None:
        user = self.collection.user_db.get_user_by_email(
            email=invitation.email,
        )
        if user is not None:
            # fmt: off
            existing_membership = self.collection.team_membership_db\
                .get_team_membership_by_user_and_team_id(
                    user_id=user.id,
                    team_id=invitation.team_id,
                )
            # fmt: on
            if existing_membership:
                return None
        # fmt: off
        existing_invitations = self.collection.team_invitation_db\
            .get_pending_invitations_by_team_and_email(
                team_id=invitation.team_id, email=invitation.email
            )
        # fmt: on
        if existing_invitations:
            return None
        invitation.token = secrets.token_urlsafe(32)
        invitation.status = TeamInvitationStatus.PENDING
        invitation.created_by = sender_id
        invitation.created_at = datetime.now(tz=timezone.utc)
        invitation.expires_at = datetime.now(tz=timezone.utc) + timedelta(
            days=7
        )
        sender = self.collection.user_db.get_user_by_id(user_id=sender_id)
        if not sender:
            raise ValueError("Sender not found")
        team = self.collection.team_db.get_team_by_id(
            team_id=invitation.team_id
        )
        if not team:
            raise ValueError("Team not found")
        await self.send_invitation_email(
            invitation=invitation, sender=sender, team=team
        )
        invitation.last_sent_at = datetime.now(tz=timezone.utc)
        invitation = self.collection.team_invitation_db.create_invitation(
            invitation=invitation
        )
        return invitation

    def get_team_invitations(self, team_id: str) -> list[TeamInvitation]:
        return self.collection.team_invitation_db.get_pending_invitations_by_team_id(
            team_id=team_id,
        )

    def get_user_pending_invitations(
        self, user_id: str
    ) -> List[EnrichedTeamInvitation]:
        user = self.collection.user_db.get_user_by_id(user_id=user_id)
        if not user:
            raise ValueError("User not found")
        invitations = self.collection.team_invitation_db.get_pending_invitations_by_email(
            email=user.email,
        )
        team_ids = list(set(invitation.team_id for invitation in invitations))
        creator_ids = list(
            set(
                invitation.created_by
                for invitation in invitations
                if invitation.created_by
            )
        )
        teams = self.collection.team_db.get_teams_by_ids(team_ids=team_ids)
        creators = self.collection.user_db.get_users_by_ids(
            user_ids=creator_ids
        )
        team_map = {team.id: team.name for team in teams}
        creator_map = {
            creator.id: f"{creator.first_name} {creator.last_name}"
            for creator in creators
        }
        return [
            EnrichedTeamInvitation(
                id=invitation.id,
                team_id=invitation.team_id,
                team_name=team_map.get(invitation.team_id, ""),
                email=invitation.email,
                type=invitation.type,
                worker_id=invitation.worker_id,
                token=invitation.token,
                status=invitation.status,
                created_at=invitation.created_at,
                expires_at=invitation.expires_at,
                last_sent_at=invitation.last_sent_at,
                first_name=invitation.first_name,
                last_name=invitation.last_name,
                created_by=invitation.created_by,
                creator_name=(
                    creator_map.get(invitation.created_by, None)
                    if invitation.created_by
                    else None
                ),
            )
            for invitation in invitations
        ]

    async def resend_invite(self, invitation_id: str) -> TeamInvitation | None:
        invitation = self.collection.team_invitation_db.get_invitation_by_id(
            invitation_id=invitation_id,
        )
        if not invitation:
            return None
        if not self.can_resend_invite(invitation):
            return None
        if invitation.created_by is None:
            raise ValueError("Sender not found")
        sender = self.collection.user_db.get_user_by_id(
            user_id=invitation.created_by,
        )
        if not sender:
            raise ValueError("Sender not found")
        team = self.collection.team_db.get_team_by_id(
            team_id=invitation.team_id
        )
        if not team:
            raise ValueError("Team not found")
        await self.send_invitation_email(
            invitation=invitation, sender=sender, team=team
        )
        invitation.last_sent_at = datetime.now(tz=timezone.utc)
        self.collection.team_invitation_db.update_invitation(invitation)
        return invitation

    # pylint: disable=too-many-return-statements
    async def accept_team_invitation(
        self, user_id: str, token: str
    ) -> TeamWithMembership:
        invitation = (
            self.collection.team_invitation_db.get_invitation_by_token(
                token=token,
            )
        )
        if not invitation:
            raise ValueError("Invitation not found")
        user = self.collection.user_db.get_user_by_id(user_id=user_id)
        if not user:
            raise ValueError("User not found")
        team = self.collection.team_db.get_team_by_id(
            team_id=invitation.team_id
        )
        if not team:
            raise ValueError("Team not found")
        if not self.validate_invitation(invitation=invitation, user=user):
            raise ValueError("Invalid invitation")
        membership_role_value = INVITE_TYPE_ROLE_MAP.get(
            invitation.type.value, {}
        ).get("role", None)
        if not membership_role_value:
            raise ValueError("Invalid membership role")
        membership_role: TeamMembershipRole | None = None
        try:
            membership_role = TeamMembershipRole(membership_role_value)
        except ValueError as e:
            raise ValueError("Invalid membership role") from e
        if membership_role is None:
            raise ValueError("Invalid membership role")
        membership = TeamMembership(
            id="",
            user_id=user.id,
            team_id=invitation.team_id,
            role=membership_role,
        )
        membership = await self.team_membership_service.create_team_membership(
            membership=membership
        )
        if (
            invitation.type == TeamInvitationType.MEMBER
            and invitation.worker_id
        ):
            worker = self.collection.worker_db.get_worker_by_id(
                worker_id=invitation.worker_id,
            )
            if worker and worker.user_id is None:
                worker.user_id = user.id
                self.collection.worker_db.update_worker(worker)
        invitation.status = TeamInvitationStatus.ACCEPTED
        self.collection.team_invitation_db.update_invitation(invitation)
        return TeamWithMembership(
            team=team,
            membership=MembershipForTeamWithMembership(
                role=membership.role,
            ),
        )

    def reject_team_invitation(self, user_id: str, token: str) -> bool:
        invitation = (
            self.collection.team_invitation_db.get_invitation_by_token(
                token=token,
            )
        )
        user = self.collection.user_db.get_user_by_id(user_id=user_id)
        if not invitation or not user:
            return False
        if not self.validate_invitation(invitation=invitation, user=user):
            return False
        invitation.status = TeamInvitationStatus.REJECTED
        self.collection.team_invitation_db.update_invitation(invitation)
        return True

    async def send_invitation_email(
        self, invitation: TeamInvitation, sender: User, team: Team
    ) -> None:
        if not self.can_resend_invite(invitation):
            return

        recipient_name = f"{invitation.first_name or ''}".strip()
        if invitation.last_name:
            recipient_name += " " + invitation.last_name.strip()

        sender_name = f"{sender.first_name} {sender.last_name}"
        invitation_link = (
            f"{config.client_url}/en/plan/settings/teams"
            f"?token={invitation.token}"
        )

        # Use email queue service if available, otherwise fall back to direct sending
        if not self.email_queue_service:
            raise ValueError("Email queue service not configured")
        try:
            await self.email_queue_service.enqueue_team_invitation(
                to_address=invitation.email,
                recipient_name=recipient_name,
                sender_name=sender_name,
                team_name=team.name,
                invitation_link=invitation_link,
                language=sender.language,
            )
            return
        except Exception as e:
            raise ValueError(
                f"Failed to send invitation email to {invitation.email}: {e}"
            ) from e

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
