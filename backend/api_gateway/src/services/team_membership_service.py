from shared.schemas.core import (
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
