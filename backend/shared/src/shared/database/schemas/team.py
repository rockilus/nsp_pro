from datetime import datetime, timezone

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team import Team


class TeamSchema(DocumentBaseSchema):
    """Team schema for validation."""

    name: str
    created_by_user_id: str
    created_at: float
    use_solver: bool

    def to_core(self) -> Team:
        return Team(
            id=self.id or "",
            name=self.name,
            created_by_user_id=self.created_by_user_id,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            use_solver=self.use_solver,
        )

    @classmethod
    def from_core(cls, team: Team) -> "TeamSchema":
        return cls(
            id=team.id,
            name=team.name,
            created_by_user_id=team.created_by_user_id,
            created_at=team.created_at.timestamp(),
            use_solver=team.use_solver,
        )
