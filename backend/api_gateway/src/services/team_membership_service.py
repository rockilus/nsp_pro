from typing import List

from shared.schemas.core import (
    TEAM_ROLE_TO_AUTHZ_ROLE,
    TeamMembership,
    TeamMembershipRole,
)

from src.integrations.authorization import authz_role_assignment_assign
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
            roles_created = list(set(membership.roles) - set(existing_membership.roles))
            if roles_created:
                existing_membership.roles.extend(roles_created)
                self.collection.team_membership_db.update_team_membership(
                    membership=existing_membership
                )
                await self.add_roles_authz(
                    membership=existing_membership,
                    roles=roles_created,
                )
            return existing_membership

        membership.roles = list(set(membership.roles))
        membership = self.collection.team_membership_db.create_team_membership(
            membership=membership
        )

        await self.add_roles_authz(
            membership=membership,
            roles=membership.roles,
        )

        return membership

    @staticmethod
    async def add_roles_authz(
        membership: TeamMembership, roles: List[TeamMembershipRole]
    ) -> None:
        for role in roles:
            authz_role = TEAM_ROLE_TO_AUTHZ_ROLE.get(role.value, None)
            if authz_role is None:
                raise ValueError(
                    f"Role {role} is not a valid role for authz assignment."
                )
            await authz_role_assignment_assign(
                user_id=membership.user_id,
                resource="team",
                resource_instance_key=membership.team_id,
                role=authz_role,
            )
