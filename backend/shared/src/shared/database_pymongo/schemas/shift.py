from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pydantic import field_validator

from shared.database_pymongo.schemas.base import BaseSchema, DocumentBaseSchema
from shared.schemas.schemas.shift import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)


class StaffingSchema(BaseSchema):
    """Staffing embedded schema."""

    specialty: Optional[ObjectId] = None  # Store specialty ID instead of reference
    staffing: int

    def to_core(self) -> Staffing:
        out = super().to_mongo()
        out["specialty_id"] = str(out.pop("specialty", None))
        return Staffing(**out)

    @classmethod
    def from_core(cls, staffing: Staffing) -> "StaffingSchema":
        return cls(
            specialty=(
                ObjectId(staffing.specialty_id) if staffing.specialty_id else None
            ),
            staffing=staffing.staffing,
        )


class ShiftSchema(DocumentBaseSchema):
    """Shift schema for validation."""

    team: ObjectId  # Store team ID instead of reference
    name: str
    acronym: str
    acronym_custom: bool
    start_time: float
    end_time: float
    staffing: List[StaffingSchema] = []
    color: str
    shift_type: int
    rest_type: int
    leave_type: int
    recuperation_time: int
    recuperation_duty: Optional[ObjectId] = None  # Store shift ID instead of reference
    deleted: bool = False

    @field_validator("shift_type")
    @classmethod
    def validate_shift_type(cls, v: int) -> int:
        """Validate shift_type is a valid enum value."""
        if v not in [e.value for e in ShiftType]:
            raise ValueError(f"Invalid shift type: {v}")
        return v

    @field_validator("rest_type")
    @classmethod
    def validate_rest_type(cls, v: int) -> int:
        """Validate rest_type is a valid enum value."""
        if v not in [e.value for e in ShiftRestType]:
            raise ValueError(f"Invalid rest type: {v}")
        return v

    @field_validator("leave_type")
    @classmethod
    def validate_leave_type(cls, v: int) -> int:
        """Validate leave_type is a valid enum value."""
        if v not in [e.value for e in ShiftLeaveType]:
            raise ValueError(f"Invalid leave type: {v}")
        return v

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        out["staffing"] = [staffing.to_mongo() for staffing in self.staffing]
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "ShiftSchema":
        data["id"] = data.pop("_id")
        data["staffing"] = [
            StaffingSchema.from_mongo(staffing) for staffing in data["staffing"]
        ]
        return cls(**data)

    def to_core(self) -> Shift:
        return Shift(
            id=str(self.id) or "",
            team_id=str(self.team),
            name=self.name,
            acronym=self.acronym,
            acronym_custom=self.acronym_custom,
            start_time=datetime.fromtimestamp(self.start_time, tz=timezone.utc),
            end_time=datetime.fromtimestamp(self.end_time, tz=timezone.utc),
            staffing=[staffing.to_core() for staffing in self.staffing],
            color=self.color,
            shift_type=ShiftType(self.shift_type),
            rest_type=ShiftRestType(self.rest_type),
            leave_type=ShiftLeaveType(self.leave_type),
            recuperation_time=self.recuperation_time,
            recuperation_duty_id=(
                str(self.recuperation_duty) if self.recuperation_duty else None
            ),
            deleted=self.deleted,
        )

    @classmethod
    def from_core(cls, shift: Shift) -> "ShiftSchema":
        return cls(
            id=(
                ObjectId(shift.id) if shift.id and ObjectId.is_valid(shift.id) else None
            ),
            team=ObjectId(shift.team_id),
            name=shift.name,
            acronym=shift.acronym,
            acronym_custom=shift.acronym_custom,
            start_time=shift.start_time.timestamp(),
            end_time=shift.end_time.timestamp(),
            staffing=[
                StaffingSchema.from_core(staffing) for staffing in shift.staffing
            ],
            color=shift.color,
            shift_type=shift.shift_type.value,
            rest_type=shift.rest_type.value,
            leave_type=shift.leave_type.value,
            recuperation_time=shift.recuperation_time,
            recuperation_duty=(
                ObjectId(shift.recuperation_duty_id)
                if shift.recuperation_duty_id
                and ObjectId.is_valid(shift.recuperation_duty_id)
                else None
            ),
            deleted=shift.deleted,
        )
