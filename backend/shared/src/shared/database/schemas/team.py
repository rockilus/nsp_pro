from typing import List

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.team import Team


class TeamSchema(DocumentBaseSchema):
    """Team schema for validation."""

    team_members: List[str]
    team_leaders: List[str]

    def to_core(self) -> Team:
        return Team(
            id=self.id or "",
            team_members=self.team_members,
            team_leaders=self.team_leaders,
        )

    @classmethod
    def from_core(cls, team: Team) -> "TeamSchema":
        return cls(
            id=team.id,
            team_members=team.team_members,
            team_leaders=team.team_leaders,
        )
