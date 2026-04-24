from typing import Literal

from pydantic import BaseModel, field_validator


class TeamGenerationSettingsDTO(BaseModel):
    team_id: str
    duty_scope_work_time: bool = True
    duty_consecutive_gap_mode: Literal["off", "set", "auto"] = "off"
    duty_consecutive_gap_days: int = 2

    @field_validator("duty_consecutive_gap_days")
    @classmethod
    def validate_gap_days(cls, v: int) -> int:
        if v < 1:
            raise ValueError("duty_consecutive_gap_days must be at least 1")
        return v
