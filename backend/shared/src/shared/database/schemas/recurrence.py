from datetime import datetime, time, timezone
from typing import List, Optional

from pydantic import field_validator

from shared.database.schemas.base import BaseSchema, DocumentBaseSchema
from shared.schemas.core.recurrence import (
    FrequencyType,
    MonthRepeatType,
    OccurrenceInfo,
    OccurrenceType,
    RecurrenceEndType,
    RecurrenceRule,
)


class OccurrenceInfoSchema(BaseSchema):
    worker_id: Optional[str] = None
    shift_id: Optional[str] = None
    count: Optional[int] = None

    def to_core(self) -> OccurrenceInfo:
        return OccurrenceInfo(
            worker_id=self.worker_id,
            shift_id=self.shift_id,
            count=self.count,
        )

    @classmethod
    def from_core(cls, occurrence_info: OccurrenceInfo) -> "OccurrenceInfoSchema":
        return cls(
            worker_id=occurrence_info.worker_id,
            shift_id=occurrence_info.shift_id,
            count=occurrence_info.count,
        )


class RecurrenceRuleSchema(DocumentBaseSchema):
    """Recurrence Rule schema for validation."""

    team_id: str
    occurrence_type: int
    occurrence_info: OccurrenceInfoSchema
    repeat_every: int
    frequency_type: int
    week_days: List[int]
    month_repeat_type: Optional[int] = None
    recurrence_end_type: int
    start_date: float
    end_date: Optional[float] = None
    number_of_occurrences: Optional[int] = None

    @field_validator("occurrence_type")
    @classmethod
    def validate_recurrence_type(cls, v: int) -> int:
        """Validate occurrence_type is a valid enum value."""
        if v not in [e.value for e in OccurrenceType]:
            raise ValueError(f"Invalid recurrence type: {v}")
        return v

    @field_validator("frequency_type")
    @classmethod
    def validate_frequency_type(cls, v: int) -> int:
        """Validate frequency_type is a valid enum value."""
        if v not in [e.value for e in FrequencyType]:
            raise ValueError(f"Invalid frequency type: {v}")
        return v

    @field_validator("month_repeat_type")
    @classmethod
    def validate_month_repeat_type(cls, v: Optional[int]) -> Optional[int]:
        """Validate month_repeat_type is a valid enum value."""
        if v is not None and v not in [e.value for e in MonthRepeatType]:
            raise ValueError(f"Invalid month repeat type: {v}")
        return v

    @field_validator("recurrence_end_type")
    @classmethod
    def validate_recurrence_end_type(cls, v: int) -> int:
        """Validate recurrence_end_type is a valid enum value."""
        if v not in [e.value for e in RecurrenceEndType]:
            raise ValueError(f"Invalid recurrence end type: {v}")
        return v

    def to_core(self) -> RecurrenceRule:
        return RecurrenceRule(
            id=self.id or "",
            team_id=self.team_id,
            occurrence_type=OccurrenceType(self.occurrence_type),
            occurrence_info=self.occurrence_info.to_core(),
            repeat_every=self.repeat_every,
            frequency_type=FrequencyType(self.frequency_type),
            week_days=self.week_days,
            month_repeat_type=(
                MonthRepeatType(self.month_repeat_type)
                if self.month_repeat_type is not None
                else None
            ),
            recurrence_end_type=RecurrenceEndType(self.recurrence_end_type),
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=(
                datetime.fromtimestamp(self.end_date, tz=timezone.utc).date()
                if self.end_date is not None
                else None
            ),
            number_of_occurrences=self.number_of_occurrences,
        )

    @classmethod
    def from_core(cls, recurrence_rule: RecurrenceRule) -> "RecurrenceRuleSchema":
        return cls(
            id=recurrence_rule.id,
            team_id=recurrence_rule.team_id,
            occurrence_type=recurrence_rule.occurrence_type.value,
            occurrence_info=OccurrenceInfoSchema.from_core(
                recurrence_rule.occurrence_info
            ),
            repeat_every=recurrence_rule.repeat_every,
            frequency_type=recurrence_rule.frequency_type.value,
            week_days=recurrence_rule.week_days,
            month_repeat_type=(
                recurrence_rule.month_repeat_type.value
                if recurrence_rule.month_repeat_type is not None
                else None
            ),
            recurrence_end_type=recurrence_rule.recurrence_end_type.value,
            start_date=datetime.combine(
                recurrence_rule.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=(
                datetime.combine(
                    recurrence_rule.end_date, time.min, timezone.utc
                ).timestamp()
                if recurrence_rule.end_date
                else None
            ),
            number_of_occurrences=recurrence_rule.number_of_occurrences,
        )
