from datetime import datetime, time, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pydantic import field_validator

from shared.database_pymongo.schemas.base import BaseSchema, DocumentBaseSchema
from shared.schemas.schemas.schedule import (
    QuickStaffing,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    SolveDetails,
    SolveDetailsStatus,
)


class QuickStaffingSchema(BaseSchema):
    """QuickStaffing embedded schema."""

    worker_id: ObjectId
    shift_id: ObjectId
    target: int

    def to_core(self) -> QuickStaffing:
        return QuickStaffing(
            worker_id=str(self.worker_id),
            shift_id=str(self.shift_id),
            target=self.target,
        )

    @classmethod
    def from_core(cls, quick_staffing: QuickStaffing) -> "QuickStaffingSchema":
        return cls(
            worker_id=ObjectId(quick_staffing.worker_id),
            shift_id=ObjectId(quick_staffing.shift_id),
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

    team: ObjectId
    start_date: float
    end_date: float
    solve_details: Optional[SolveDetailsSchema] = None
    solve_status: int
    status: int
    missing_coverage_dates: List[float] = []
    constraint_build_ids: List[ObjectId] = []
    quick_staffings: List[QuickStaffingSchema] = []

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
        data["id"] = data.pop("_id")
        if "solve_details" in data:
            data["solve_details"] = SolveDetailsSchema.from_mongo(data["solve_details"])
        data["quick_staffings"] = [
            QuickStaffingSchema.from_mongo(qs) for qs in data["quick_staffings"]
        ]
        return cls(**data)

    def to_core(self) -> Schedule:
        return Schedule(
            id=str(self.id) or "",
            team_id=str(self.team),
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(self.end_date, tz=timezone.utc).date(),
            solve_details=(
                self.solve_details.to_core() if self.solve_details else None
            ),
            solve_status=ScheduleSolveStatus(self.solve_status),
            status=ScheduleStatus(self.status),
            missing_coverage_dates=[
                datetime.fromtimestamp(dt, tz=timezone.utc).date()
                for dt in self.missing_coverage_dates
            ],
            constraint_build_ids=[str(cb_id) for cb_id in self.constraint_build_ids],
            quick_staffings=[qs.to_core() for qs in self.quick_staffings],
        )

    @classmethod
    def from_core(cls, schedule: Schedule) -> "ScheduleSchema":
        return cls(
            id=(
                ObjectId(schedule.id)
                if schedule.id and ObjectId.is_valid(schedule.id)
                else None
            ),
            team=ObjectId(schedule.team_id),
            start_date=datetime.combine(
                schedule.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                schedule.end_date, time.min, timezone.utc
            ).timestamp(),
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
            constraint_build_ids=[
                ObjectId(cb_id) for cb_id in schedule.constraint_build_ids
            ],
            quick_staffings=[
                QuickStaffingSchema.from_core(qs) for qs in schedule.quick_staffings
            ],
        )
