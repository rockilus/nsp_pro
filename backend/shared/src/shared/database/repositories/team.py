from typing import Any, Dict, List, Optional, Tuple

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.team import TeamSchema
from shared.schemas.core.team import Team


class TeamRepository(BaseRepository[TeamSchema]):
    """Repository for team documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "teams", TeamSchema)

    def create_team(self, team: Team) -> Team:
        """Create a new team."""
        team_schema = TeamSchema.from_core(team)
        result = self.create(team_schema)
        return result.to_core()

    def get_teams(self) -> List[Team]:
        """Get all teams."""
        teams = self.find_all()
        return [team.to_core() for team in teams]

    def get_team_by_id(self, team_id: str) -> Team | None:
        """Get a team by its ID."""
        team = self.find_by_id(team_id)
        if team is None:
            return None
        return team.to_core()

    def get_teams_by_ids(self, team_ids: List[str]) -> List[Team]:
        """Get multiple teams by their IDs."""
        teams = self.find_all({"_id": {"$in": team_ids}})
        return [team.to_core() for team in teams]

    def update_team(self, team: Team) -> Team:
        """Update a team."""
        team_schema = TeamSchema.from_core(team)
        team_updated = self.update(team_schema)
        assert team_updated is not None
        return team_updated.to_core()

    def get_all_teams_paginated(
        self,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 30,
    ) -> Tuple[List[Team], int]:
        """Get a paginated list of teams with optional filters.

        Returns a tuple of (teams, total_count).
        """
        query = filters or {}
        total = self.count(query)
        teams = self.find_all(query, limit=limit, skip=skip)
        return [team.to_core() for team in teams], total

    def delete_team(self, team_id: str) -> None:
        """Delete a team by its ID."""
        result = self.delete(team_id)
        if result is False:
            raise Exception(f"Team with id {team_id} not found or already deleted")
