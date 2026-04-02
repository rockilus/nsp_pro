from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from pydantic import field_validator

from shared.database.schemas.base import (
    BaseSchema,
    DocumentBaseSchema,
)
from shared.schemas.core.schedule import (
    QuickStaffing,
    Schedule,
    ScheduleStatus,
)


class QuickStaffingSchema(BaseSchema):
    """QuickStaffing embedded schema."""

    worker_id: str
    shift_id: str
    target: int

    def to_core(self) -> QuickStaffing:
        return QuickStaffing(
            worker_id=self.worker_id,
            shift_id=self.shift_id,
            target=self.target,
        )

    @classmethod
    def from_core(cls, quick_staffing: QuickStaffing) -> "QuickStaffingSchema":
        return cls(
            worker_id=quick_staffing.worker_id,
            shift_id=quick_staffing.shift_id,
            target=quick_staffing.target,
        )


class ScheduleSchema(DocumentBaseSchema):
    """Schedule schema for validation."""

    team: str
    start_date: float
    end_date: float
    status: int
    missing_coverage_dates: List[float] = []
    constraint_builds: List[str] = []
    quick_staffings: List[QuickStaffingSchema] = []
    created_at: float
    updated_at: float
    request_deadline: Optional[float] = None
    last_reminder_sent_at: Optional[float] = None
    created_by: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: int) -> int:
        """Validate status is a valid enum value."""
        if v not in [e.value for e in ScheduleStatus]:
            raise ValueError(f"Invalid schedule status: {v}")
        return v

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        out["quick_staffings"] = [qs.to_mongo() for qs in self.quick_staffings]
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ScheduleSchema":
        data["id"] = str(data.pop("_id"))
        data["quick_staffings"] = [
            QuickStaffingSchema.from_mongo(qs) for qs in data["quick_staffings"]
        ]
        return cls(**data)

    def to_core(self) -> Schedule:
        return Schedule(
            id=self.id or "",
            team_id=self.team,
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(self.end_date, tz=timezone.utc).date(),
            status=ScheduleStatus(self.status),
            missing_coverage_dates=[
                datetime.fromtimestamp(dt, tz=timezone.utc).date()
                for dt in self.missing_coverage_dates
            ],
            constraint_build_ids=self.constraint_builds,
            quick_staffings=[qs.to_core() for qs in self.quick_staffings],
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
            updated_at=datetime.fromtimestamp(self.updated_at, tz=timezone.utc),
            request_deadline=(
                datetime.fromtimestamp(self.request_deadline, tz=timezone.utc).date()
                if self.request_deadline is not None
                else None
            ),
            last_reminder_sent_at=(
                datetime.fromtimestamp(self.last_reminder_sent_at, tz=timezone.utc)
                if self.last_reminder_sent_at is not None
                else None
            ),
            created_by=self.created_by,
        )

    @classmethod
    def from_core(cls, schedule: Schedule) -> "ScheduleSchema":
        return cls(
            id=schedule.id,
            team=schedule.team_id,
            start_date=datetime.combine(
                schedule.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                schedule.end_date, time.min, timezone.utc
            ).timestamp(),
            status=schedule.status.value,
            missing_coverage_dates=[
                datetime.combine(dt, time.min, timezone.utc).timestamp()
                for dt in schedule.missing_coverage_dates
            ],
            constraint_builds=schedule.constraint_build_ids,
            quick_staffings=[
                QuickStaffingSchema.from_core(qs) for qs in schedule.quick_staffings
            ],
            created_at=schedule.created_at.timestamp(),
            updated_at=schedule.updated_at.timestamp(),
            request_deadline=(
                datetime.combine(
                    schedule.request_deadline, time.min, timezone.utc
                ).timestamp()
                if schedule.request_deadline is not None
                else None
            ),
            last_reminder_sent_at=(
                schedule.last_reminder_sent_at.timestamp()
                if schedule.last_reminder_sent_at is not None
                else None
            ),
            created_by=schedule.created_by,
        )
