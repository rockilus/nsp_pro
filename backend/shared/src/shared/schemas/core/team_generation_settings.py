from dataclasses import dataclass
from typing import Literal


@dataclass
class TeamGenerationSettings:
    team_id: str
    duty_scope_work_time: bool = True
    # "off" | "set" | "auto"
    duty_consecutive_gap_mode: Literal["off", "set", "auto"] = "off"
    duty_consecutive_gap_days: int = 2

    @classmethod
    def default(cls, team_id: str) -> "TeamGenerationSettings":
        """Return default settings for a team. Single source of truth for defaults."""
        return cls(team_id=team_id)

    def to_dict(self) -> dict:
        return {
            "team_id": self.team_id,
            "duty_scope_work_time": self.duty_scope_work_time,
            "duty_consecutive_gap_mode": self.duty_consecutive_gap_mode,
            "duty_consecutive_gap_days": self.duty_consecutive_gap_days,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "TeamGenerationSettings":
        return cls(
            team_id=data["team_id"],
            duty_scope_work_time=data.get("duty_scope_work_time", True),
            duty_consecutive_gap_mode=data.get("duty_consecutive_gap_mode", "off"),
            duty_consecutive_gap_days=data.get("duty_consecutive_gap_days", 2),
        )
