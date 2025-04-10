from datetime import datetime, timezone
from typing import List, Optional

from pydantic import field_validator

from shared.database.schemas.base import (
    DocumentBaseSchema,
)
from shared.schemas.core.recurrence import (
    FrequencyType,
    MonthRepeatType,
    RecurrenceEndType,
    RecurrenceRule,
    RecurrenceType,
)


class RecurrenceRuleSchema(DocumentBaseSchema):
    """Recurrence Rule schema for validation."""

    team_id: str
    recurrence_type: int
    assignment_id: Optional[str] = None
    daily_shift_demand_id: Optional[str] = None
    repeat_every: int
    frequency_type: int
    week_days: List[int]
    month_repeat_type: Optional[int] = None
    recurrence_end_type: int
    start_date: float
    end_date: Optional[float] = None
    number_of_occurrences: Optional[int] = None

    @field_validator("recurrence_type")
    @classmethod
    def validate_recurrence_type(cls, v: int) -> int:
        """Validate recurrence_type is a valid enum value."""
        if v not in [e.value for e in RecurrenceType]:
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
            recurrence_type=RecurrenceType(self.recurrence_type),
            assignment_id=self.assignment_id,
            daily_shift_demand_id=self.daily_shift_demand_id,
            repeat_every=self.repeat_every,
            frequency_type=FrequencyType(self.frequency_type),
            week_days=self.week_days,
            month_repeat_type=(
                MonthRepeatType(self.month_repeat_type)
                if self.month_repeat_type is not None
                else None
            ),
            recurrence_end_type=RecurrenceEndType(self.recurrence_end_type),
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc),
            end_date=(
                datetime.fromtimestamp(self.end_date, tz=timezone.utc)
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
            recurrence_type=recurrence_rule.recurrence_type.value,
            assignment_id=recurrence_rule.assignment_id,
            daily_shift_demand_id=recurrence_rule.daily_shift_demand_id,
            repeat_every=recurrence_rule.repeat_every,
            frequency_type=recurrence_rule.frequency_type.value,
            week_days=recurrence_rule.week_days,
            month_repeat_type=(
                recurrence_rule.month_repeat_type.value
                if recurrence_rule.month_repeat_type is not None
                else None
            ),
            recurrence_end_type=recurrence_rule.recurrence_end_type.value,
            start_date=recurrence_rule.start_date.timestamp(),
            end_date=(
                recurrence_rule.end_date.timestamp()
                if recurrence_rule.end_date is not None
                else None
            ),
            number_of_occurrences=recurrence_rule.number_of_occurrences,
        )
