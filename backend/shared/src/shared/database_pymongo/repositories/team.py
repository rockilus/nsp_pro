from typing import List

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.team import TeamSchema
from shared.schemas.schemas.team import Team


class TeamRepository(BaseRepository[TeamSchema]):
    """Repository for team documents using PyMongo."""

    def __init__(self):
        super().__init__("teams", TeamSchema)

    def create_team(self, team: Team) -> Team:
        """Create a new team."""
        team_schema = TeamSchema.from_core(team)
        result = self.create(team_schema)
        return result.to_core()

    def get_teams(self) -> List[Team]:
        """Get all teams."""
        teams = self.find_all()
        return [team.to_core() for team in teams]

    def get_team_by_id(self, team_id: str) -> Team:
        """Get a team by its ID."""
        team = self.find_by_id(team_id)
        if not team:
            raise Exception(f"Team with id {team_id} not found")
        return team.to_core()

    def get_teams_by_ids(self, team_ids: List[str]) -> List[Team]:
        """Get multiple teams by their IDs."""
        teams = self.find_all({"_id": {"$in": [ObjectId(tid) for tid in team_ids]}})
        return [team.to_core() for team in teams]

    def get_teams_by_leader_id(self, leader_id: str) -> List[Team]:
        """Get all teams for a leader."""
        # teams = self.find_all({"team_leaders": ObjectId(leader_id)})
        teams = self.find_all({"team_leaders": leader_id})
        return [team.to_core() for team in teams]

    def update_team(self, team: Team) -> Team:
        """Update a team."""
        team_schema = TeamSchema.from_core(team)
        team_updated = self.update(team_schema)
        assert team_updated is not None
        return team_updated.to_core()

    def delete_team(self, team_id: str) -> None:
        """Delete a team by its ID."""
        result = self.delete(team_id)
        if result is False:
            raise Exception(f"Team with id {team_id} not found or already deleted")
