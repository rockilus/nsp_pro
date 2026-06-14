from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.worker import WeeklyPreferences, Worker


class WorkerSchema(DocumentBaseSchema):
    """Worker schema for validation."""

    team: str
    name: str
    acronym: str
    acronym_custom: bool
    employment_start_date: float
    employment_end_date: Optional[float] = None
    weekly_hours: int
    weekly_hours_desired: int
    duties_per_month: int
    annual_leave: int
    specialties: List[str] = []
    weekly_preferences: Optional[Dict[str, Any]] = None
    deleted: bool = False
    user_id: Optional[str] = None

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "WorkerSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    # pylint: disable=R0801
    def to_core(self) -> Worker:
        return Worker(
            id=self.id or "",
            team_id=self.team,
            name=self.name,
            acronym=self.acronym,
            acronym_custom=self.acronym_custom,
            employment_start_date=datetime.fromtimestamp(
                self.employment_start_date, tz=timezone.utc
            ).date(),
            employment_end_date=(
                datetime.fromtimestamp(self.employment_end_date, tz=timezone.utc).date()
                if self.employment_end_date
                else None
            ),
            weekly_hours=self.weekly_hours,
            weekly_hours_desired=self.weekly_hours_desired,
            duties_per_month=self.duties_per_month,
            annual_leave=self.annual_leave,
            specialty_ids=self.specialties,
            weekly_preferences=(
                WeeklyPreferences.from_dict(self.weekly_preferences)
                if self.weekly_preferences
                else None
            ),
            deleted=self.deleted,
            user_id=self.user_id,
        )

    @classmethod
    def from_core(cls, worker: Worker) -> "WorkerSchema":
        return cls(
            id=worker.id,
            team=worker.team_id,
            name=worker.name,
            acronym=worker.acronym,
            acronym_custom=worker.acronym_custom,
            employment_start_date=datetime.combine(
                worker.employment_start_date, time.min, timezone.utc
            ).timestamp(),
            employment_end_date=(
                datetime.combine(
                    worker.employment_end_date, time.min, timezone.utc
                ).timestamp()
                if worker.employment_end_date
                else None
            ),
            weekly_hours=worker.weekly_hours,
            weekly_hours_desired=worker.weekly_hours_desired,
            duties_per_month=worker.duties_per_month,
            annual_leave=worker.annual_leave,
            specialties=worker.specialty_ids,
            weekly_preferences=(
                worker.weekly_preferences.to_dict()
                if worker.weekly_preferences
                else None
            ),
            deleted=worker.deleted,
            user_id=worker.user_id,
        )
