from datetime import datetime, timezone
from typing import Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team import Team, _slot_periods_from_dict


class TeamSchema(DocumentBaseSchema):
    """Team schema for validation."""

    name: str
    created_by_user_id: str
    created_at: float
    use_solver: bool
    show_stats: bool = False
    slot_periods: Optional[dict] = None

    def to_core(self) -> Team:
        return Team(
            id=self.id or "",
            name=self.name,
            created_by_user_id=self.created_by_user_id,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            use_solver=self.use_solver,
            show_stats=self.show_stats,
            slot_periods=_slot_periods_from_dict(self.slot_periods),
        )

    @classmethod
    def from_core(cls, team: Team) -> "TeamSchema":
        sp_dict = None
        if team.slot_periods is not None:
            from dataclasses import asdict

            sp_dict = {
                "morning": asdict(team.slot_periods.morning),
                "afternoon": asdict(team.slot_periods.afternoon),
                "night": asdict(team.slot_periods.night),
            }
        return cls(
            id=team.id,
            name=team.name,
            created_by_user_id=team.created_by_user_id,
            created_at=team.created_at.timestamp(),
            use_solver=team.use_solver,
            show_stats=team.show_stats,
            slot_periods=sp_dict,
        )
