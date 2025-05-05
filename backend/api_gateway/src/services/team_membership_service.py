from shared.schemas.core import (
    TEAM_ROLE_TO_AUTHZ_ROLE,
    TeamMembership,
    TeamMembershipRole,
)

from src.integrations.authorization import (
    authz_role_assignment_assign,
    authz_role_assignment_unassign,
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

        await self.add_role_authz(membership=membership)

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

        await self.remove_role_authz(membership=existing_membership)

        self.collection.team_membership_db.delete_team_membership(
            membership_id=membership_id
        )

    @staticmethod
    async def add_role_authz(membership: TeamMembership) -> None:
        authz_role = TEAM_ROLE_TO_AUTHZ_ROLE.get(membership.role.value, None)
        if authz_role is None:
            raise ValueError(
                f"Role {membership.role.value} is not a valid role for authz "
                + "assignment."
            )
        await authz_role_assignment_assign(
            user_id=membership.user_id,
            resource="team",
            resource_instance_key=membership.team_id,
            role=authz_role,
        )

    @staticmethod
    async def remove_role_authz(membership: TeamMembership) -> None:
        authz_role = TEAM_ROLE_TO_AUTHZ_ROLE.get(membership.role.value, None)
        if authz_role is None:
            raise ValueError(
                f"Role {membership.role.value} is not a valid role for authz "
                + "assignment."
            )
        await authz_role_assignment_unassign(
            user_id=membership.user_id,
            resource="team",
            resource_instance_key=membership.team_id,
            role=authz_role,
        )
