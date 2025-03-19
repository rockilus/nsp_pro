from typing import List

from bson import ObjectId

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.team import Team


class TeamSchema(DocumentBaseSchema):
    """Team schema for validation."""

    # team_members: List[ObjectId]
    # team_leaders: List[ObjectId]
    team_members: List[str]
    team_leaders: List[str]

    def to_core(self) -> Team:
        return Team(
            id=str(self.id) or "",
            # team_members=[str(member) for member in self.team_members],
            # team_leaders=[str(leader) for leader in self.team_leaders],
            team_members=self.team_members,
            team_leaders=self.team_leaders,
        )

    @classmethod
    def from_core(cls, team: Team) -> "TeamSchema":
        return cls(
            id=(ObjectId(team.id) if team.id and ObjectId.is_valid(team.id) else None),
            # team_members=[ObjectId(member) for member in team.team_members],
            # team_leaders=[ObjectId(leader) for leader in team.team_leaders],
            team_members=team.team_members,
            team_leaders=team.team_leaders,
        )
