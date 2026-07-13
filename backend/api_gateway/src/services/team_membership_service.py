from shared.schemas.core import (
    TEAM_ROLE_TO_AUTHZ_ROLE,
    TeamMembership,
    TeamMembershipRole,
)

from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods
class TeamMembershipService(BaseService):
    async def create_team_membership(
        self, membership: TeamMembership
    ) -> TeamMembership:
        existing_membership = (
            self.collection.team_membership_db.get_team_membership_by_user_and_team_id(
                user_id=membership.user_id,
                team_id=membership.team_id,
            )
        )
        if existing_membership:
            return existing_membership

        membership = self.collection.team_membership_db.create_team_membership(
            membership=membership
        )

        return membership

    async def delete_team_membership(self, membership_id: str) -> None:
        existing_membership = (
            self.collection.team_membership_db.get_team_membership_by_id(
                membership_id=membership_id,
            )
        )
        if not existing_membership:
            return
        if existing_membership.role == TeamMembershipRole.OWNER:
            # pylint: disable=broad-exception-raised
            raise Exception("Cannot leave team as owner")

        self.collection.team_membership_db.delete_team_membership(
            membership_id=membership_id
        )

    def get_user_team_role(self, user_id: str, team_id: str) -> str | None:
        """Return the authz role ('leader' or 'member'), or None."""
        membership = (
            self.collection.team_membership_db.get_team_membership_by_user_and_team_id(
                user_id, team_id
            )
        )
        if membership is None:
            return None
        return TEAM_ROLE_TO_AUTHZ_ROLE.get(membership.role.value)

    def update_membership_role(
        self, team_id: str, user_id: str, new_role: TeamMembershipRole
    ) -> TeamMembership:
        if new_role not in (TeamMembershipRole.OWNER, TeamMembershipRole.MEMBER):
            raise ValueError(f"Invalid role: {new_role.value}")

        membership = (
            self.collection.team_membership_db.get_team_membership_by_user_and_team_id(
                user_id=user_id, team_id=team_id
            )
        )
        if membership is None:
            raise ValueError("Membership not found")

        if membership.role == new_role:
            return membership

        if (
            membership.role == TeamMembershipRole.OWNER
            and new_role == TeamMembershipRole.MEMBER
        ):
            all_team_memberships = (
                self.collection.team_membership_db.get_team_memberships_by_team_id(
                    team_id=team_id
                )
            )
            owner_count = sum(
                1
                for m in all_team_memberships
                if m.role == TeamMembershipRole.OWNER and m.user_id != user_id
            )
            if owner_count == 0:
                raise ValueError("Cannot demote the last owner of a team")

        membership.role = new_role
        return self.collection.team_membership_db.update_team_membership(membership)
