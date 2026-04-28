from typing import Literal

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team_generation_settings import TeamGenerationSettings


class TeamGenerationSettingsSchema(DocumentBaseSchema):
    """DB schema for team generation settings."""

    team_id: str
    duty_scope_work_time: bool = True
    duty_consecutive_gap_mode: Literal["off", "set", "auto"] = "off"
    duty_consecutive_gap_days: int = 2

    def to_core(self) -> TeamGenerationSettings:
        return TeamGenerationSettings(
            team_id=self.team_id,
            duty_scope_work_time=self.duty_scope_work_time,
            duty_consecutive_gap_mode=self.duty_consecutive_gap_mode,
            duty_consecutive_gap_days=self.duty_consecutive_gap_days,
        )

    @classmethod
    def from_core(
        cls, settings: TeamGenerationSettings
    ) -> "TeamGenerationSettingsSchema":
        return cls(
            team_id=settings.team_id,
            duty_scope_work_time=settings.duty_scope_work_time,
            duty_consecutive_gap_mode=settings.duty_consecutive_gap_mode,
            duty_consecutive_gap_days=settings.duty_consecutive_gap_days,
        )
