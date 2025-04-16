from dataclasses import asdict, dataclass
from datetime import date
from enum import Enum
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.recurrence import RecurrenceRuleDTO


class RecurrenceType(Enum):
    ASSIGNMENT = 0
    DAILY_SHIFT_DEMAND = 1


class FrequencyType(Enum):
    DAY = 0
    WEEK = 1
    MONTH = 2
    YEAR = 3


class MonthRepeatType(Enum):
    DAY_IN_MONTH = 0
    WEEKDAY = 1


class RecurrenceEndType(Enum):
    NEVER = 0
    END_DATE = 1
    NUMBER_OF_OCCURRENCES = 2


# pylint: disable=too-many-instance-attributes
@dataclass
class RecurrenceRule:
    id: str
    team_id: str
    recurrence_type: RecurrenceType
    assignment_id: str | None
    daily_shift_demand_id: str | None
    repeat_every: int
    frequency_type: FrequencyType
    week_days: list[int]
    month_repeat_type: MonthRepeatType | None
    recurrence_end_type: RecurrenceEndType
    start_date: date
    end_date: date | None
    number_of_occurrences: int | None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["recurrence_type"] = self.recurrence_type.value
        out["frequency_type"] = self.frequency_type.value
        out["month_repeat_type"] = (
            self.month_repeat_type.value if self.month_repeat_type else None
        )
        out["recurrence_end_type"] = self.recurrence_end_type.value
        out["start_date"] = self.start_date.isoformat()
        out["end_date"] = self.end_date.isoformat() if self.end_date else None
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "RecurrenceRule":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            recurrence_type=RecurrenceType(data["recurrence_type"]),
            assignment_id=data["assignment_id"],
            daily_shift_demand_id=data["daily_shift_demand_id"],
            repeat_every=data["repeat_every"],
            frequency_type=FrequencyType(data["frequency_type"]),
            week_days=data["week_days"],
            month_repeat_type=(
                MonthRepeatType(data["month_repeat_type"])
                if data["month_repeat_type"]
                else None
            ),
            recurrence_end_type=RecurrenceEndType(data["recurrence_end_type"]),
            start_date=date.fromisoformat(data["start_date"]),
            end_date=(
                date.fromisoformat(data["end_date"])
                if data["end_date"]
                else None
            ),
            number_of_occurrences=data["number_of_occurrences"],
        )

    def to_dto(self) -> RecurrenceRuleDTO:
        data = asdict(self)
        data["recurrence_type"] = self.recurrence_type.value
        data["frequency_type"] = self.frequency_type.value
        data["month_repeat_type"] = (
            self.month_repeat_type.value if self.month_repeat_type else None
        )
        data["recurrence_end_type"] = self.recurrence_end_type.value
        data["start_date"] = self.start_date.isoformat()
        data["end_date"] = self.end_date.isoformat() if self.end_date else None
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RecurrenceRuleDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: RecurrenceRuleDTO) -> "RecurrenceRule":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["recurrence_type"] = RecurrenceType(
            data_snake["recurrence_type"]
        )
        data_snake["frequency_type"] = FrequencyType(
            data_snake["frequency_type"]
        )
        data_snake["month_repeat_type"] = (
            MonthRepeatType(data_snake["month_repeat_type"])
            if data_snake["month_repeat_type"]
            else None
        )
        data_snake["recurrence_end_type"] = RecurrenceEndType(
            data_snake["recurrence_end_type"]
        )
        data_snake["start_date"] = date.fromisoformat(data_snake["start_date"])
        data_snake["end_date"] = (
            date.fromisoformat(data_snake["end_date"])
            if data_snake["end_date"]
            else None
        )
        return cls(**data_snake)


@dataclass
class RecurrenceExclusion:
    id: str
    recurrence_rule_id: str
    excluded_date: date


class RecurrenceUpdateScope(Enum):
    NONE = 0  # No update
    SINGLE = 1  # Only the current occurrence
    FUTURE = 2  # All future occurrences
    ALL = 3  # All occurrences
    DELETE_RECURRENCE = (
        4  # Delete the recurrence rule, keep the current occurrence
    )
