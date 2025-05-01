from shared.schemas.core import TeamMembership

from src.integrations.authorization import (
    authz_role_assignment_assign,
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

        await authz_role_assignment_assign(
            user_id=membership.user_id,
            resource="team",
            resource_instance_key=membership.team_id,
            role="leader",
        )

        return membership
