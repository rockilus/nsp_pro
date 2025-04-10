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
    ScheduleSolveStatus,
    ScheduleStatus,
    SolveDetails,
    SolveDetailsStatus,
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


class SolveDetailsSchema(BaseSchema):
    """SolveDetails embedded schema."""

    task_id: str
    status: int
    updated_at: float
    result: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: int) -> int:
        """Validate status is a valid enum value."""
        if v not in [e.value for e in SolveDetailsStatus]:
            raise ValueError(f"Invalid solve details status: {v}")
        return v

    def to_core(self) -> SolveDetails:
        return SolveDetails(
            task_id=self.task_id,
            status=SolveDetailsStatus(self.status),
            updated_at=datetime.fromtimestamp(self.updated_at, tz=timezone.utc),
            result=self.result,
        )

    @classmethod
    def from_core(cls, solve_details: SolveDetails) -> "SolveDetailsSchema":
        return cls(
            task_id=solve_details.task_id,
            status=solve_details.status.value,
            updated_at=solve_details.updated_at.timestamp(),
            result=solve_details.result,
        )


class ScheduleSchema(DocumentBaseSchema):
    """Schedule schema for validation."""

    team: str
    start_date: float
    end_date: float
    last_modified_dates: float
    solve_details: Optional[SolveDetailsSchema] = None
    solve_status: int
    status: int
    missing_coverage_dates: List[float] = []
    constraint_builds: List[str] = []
    quick_staffings: List[QuickStaffingSchema] = []
    last_updated_dsds: Optional[float] = None

    @field_validator("solve_status")
    @classmethod
    def validate_solve_status(cls, v: int) -> int:
        """Validate solve_status is a valid enum value."""
        if v not in [e.value for e in ScheduleSolveStatus]:
            raise ValueError(f"Invalid schedule solve status: {v}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: int) -> int:
        """Validate status is a valid enum value."""
        if v not in [e.value for e in ScheduleStatus]:
            raise ValueError(f"Invalid schedule status: {v}")
        return v

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        if self.solve_details:
            out["solve_details"] = self.solve_details.to_mongo()
        out["quick_staffings"] = [qs.to_mongo() for qs in self.quick_staffings]
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ScheduleSchema":
        data["id"] = str(data.pop("_id"))
        if "solve_details" in data:
            data["solve_details"] = SolveDetailsSchema.from_mongo(data["solve_details"])
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
            last_modified_dates=datetime.fromtimestamp(
                self.last_modified_dates, tz=timezone.utc
            ),
            solve_details=(
                self.solve_details.to_core() if self.solve_details else None
            ),
            solve_status=ScheduleSolveStatus(self.solve_status),
            status=ScheduleStatus(self.status),
            missing_coverage_dates=[
                datetime.fromtimestamp(dt, tz=timezone.utc).date()
                for dt in self.missing_coverage_dates
            ],
            constraint_build_ids=self.constraint_builds,
            quick_staffings=[qs.to_core() for qs in self.quick_staffings],
            last_updated_dsds=(
                datetime.fromtimestamp(self.last_updated_dsds, tz=timezone.utc)
                if self.last_updated_dsds
                else None
            ),
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
            last_modified_dates=schedule.last_modified_dates.timestamp(),
            solve_details=(
                SolveDetailsSchema.from_core(schedule.solve_details)
                if schedule.solve_details
                else None
            ),
            solve_status=schedule.solve_status.value,
            status=schedule.status.value,
            missing_coverage_dates=[
                datetime.combine(dt, time.min, timezone.utc).timestamp()
                for dt in schedule.missing_coverage_dates
            ],
            constraint_builds=schedule.constraint_build_ids,
            quick_staffings=[
                QuickStaffingSchema.from_core(qs) for qs in schedule.quick_staffings
            ],
            last_updated_dsds=(
                schedule.last_updated_dsds.timestamp()
                if schedule.last_updated_dsds
                else None
            ),
        )
