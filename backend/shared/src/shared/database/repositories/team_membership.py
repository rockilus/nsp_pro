from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.team_membership import TeamMembershipSchema
from shared.schemas.core.team_membership import TeamMembership


class TeamMembershipRepository(BaseRepository[TeamMembershipSchema]):
    """Repository for team membership documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "team_memberships", TeamMembershipSchema)

    def create_team_membership(self, membership: TeamMembership) -> TeamMembership:
        """Create a new team membership."""
        membership_schema = TeamMembershipSchema.from_core(membership)
        result = self.create(membership_schema)
        return result.to_core()

    def create_team_memberships(
        self, memberships: List[TeamMembership]
    ) -> List[TeamMembership]:
        """Create multiple team memberships at once."""
        if not memberships:
            return []

        membership_schemas = [
            TeamMembershipSchema.from_core(membership) for membership in memberships
        ]
        result = self.create_many(membership_schemas)
        return [membership.to_core() for membership in result]

    def get_team_membership_by_id(self, membership_id: str) -> TeamMembership | None:
        """Get a team membership by its ID."""
        membership = self.find_by_id(membership_id)
        if not membership:
            return None
        return membership.to_core()

    def get_team_memberships_by_team_id(self, team_id: str) -> List[TeamMembership]:
        """Get all team memberships for a team."""
        memberships = self.find_all({"team_id": team_id})
        return [membership.to_core() for membership in memberships]

    def get_team_memberships_by_user_id(self, user_id: str) -> List[TeamMembership]:
        """Get all team memberships for a user."""
        memberships = self.find_all({"user_id": user_id})
        return [membership.to_core() for membership in memberships]

    def get_team_membership_by_user_and_team_id(
        self, user_id: str, team_id: str
    ) -> TeamMembership | None:
        """Get a team membership by user ID and team ID."""
        membership = self.find_one({"user_id": user_id, "team_id": team_id})
        if not membership:
            return None
        return membership.to_core()

    def update_team_membership(self, membership: TeamMembership) -> TeamMembership:
        """Update a team membership."""
        membership_schema = TeamMembershipSchema.from_core(membership)
        updated_membership = self.update(membership_schema)
        assert updated_membership is not None
        return updated_membership.to_core()

    def delete_team_membership(self, membership_id: str) -> None:
        """Delete a team membership by its ID."""
        result = self.delete(membership_id)
        if result is False:
            raise ValueError(
                f"Team membership with id {membership_id} not found or already deleted"
            )
