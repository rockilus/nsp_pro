from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from enum import Enum
from typing import Dict

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.recurrence import OccurrenceInfoDTO, RecurrenceRuleDTO


class OccurrenceType(Enum):
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


@dataclass
class OccurrenceInfo:
    shift_id: str | None = None
    worker_id: str | None = None
    count: int | None = None

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "OccurrenceInfo":
        return cls(
            worker_id=data.get("worker_id"),
            shift_id=data["shift_id"],
            count=data.get("count"),
        )

    def to_dto(self) -> OccurrenceInfoDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(OccurrenceInfoDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: OccurrenceInfoDTO) -> "OccurrenceInfo":
        data_snake = humps.decamelize(data.model_dump())
        return cls(**data_snake)


# pylint: disable=too-many-instance-attributes
@dataclass
class RecurrenceRule:
    id: str
    team_id: str
    occurrence_type: OccurrenceType
    occurrence_info: OccurrenceInfo
    repeat_every: int
    frequency_type: FrequencyType
    week_days: list[int]
    month_repeat_type: MonthRepeatType | None
    recurrence_end_type: RecurrenceEndType
    start_date: date
    end_date: date | None
    number_of_occurrences: int | None
    last_materialized_until: date | None = None

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["occurrence_type"] = self.occurrence_type.value
        out["occurrence_info"] = self.occurrence_info.to_dict()
        out["frequency_type"] = self.frequency_type.value
        out["month_repeat_type"] = (
            self.month_repeat_type.value if self.month_repeat_type else None
        )
        out["recurrence_end_type"] = self.recurrence_end_type.value
        out["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        out["end_date"] = (
            datetime.combine(self.end_date, time.min, tzinfo=timezone.utc).timestamp()
            if self.end_date
            else None
        )
        out["last_materialized_until"] = (
            datetime.combine(
                self.last_materialized_until, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.last_materialized_until
            else None
        )
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "RecurrenceRule":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            occurrence_type=OccurrenceType(data["occurrence_type"]),
            occurrence_info=OccurrenceInfo.from_dict(data["occurrence_info"]),
            repeat_every=data["repeat_every"],
            frequency_type=FrequencyType(data["frequency_type"]),
            week_days=data["week_days"],
            month_repeat_type=(
                MonthRepeatType(data["month_repeat_type"])
                if data["month_repeat_type"]
                else None
            ),
            recurrence_end_type=RecurrenceEndType(data["recurrence_end_type"]),
            start_date=datetime.fromtimestamp(data["start_date"], timezone.utc).date(),
            end_date=(
                datetime.fromtimestamp(data["end_date"], timezone.utc).date()
                if data["end_date"]
                else None
            ),
            number_of_occurrences=data["number_of_occurrences"],
            last_materialized_until=(
                datetime.fromtimestamp(
                    data["last_materialized_until"], timezone.utc
                ).date()
                if data.get("last_materialized_until")
                else None
            ),
        )

    def to_dto(self) -> RecurrenceRuleDTO:
        data = asdict(self)
        data["occurrence_type"] = self.occurrence_type.value
        data["occurrence_info"] = self.occurrence_info.to_dto()
        data["frequency_type"] = self.frequency_type.value
        data["month_repeat_type"] = (
            self.month_repeat_type.value if self.month_repeat_type else None
        )
        data["recurrence_end_type"] = self.recurrence_end_type.value
        data["start_date"] = datetime.combine(
            self.start_date, time.min, tzinfo=timezone.utc
        ).timestamp()
        data["end_date"] = (
            datetime.combine(self.end_date, time.min, tzinfo=timezone.utc).timestamp()
            if self.end_date
            else None
        )
        data["last_materialized_until"] = (
            datetime.combine(
                self.last_materialized_until, time.min, tzinfo=timezone.utc
            ).timestamp()
            if self.last_materialized_until
            else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(RecurrenceRuleDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: RecurrenceRuleDTO) -> "RecurrenceRule":
        data_snake = humps.decamelize(data.model_dump())
        data_snake["occurrence_type"] = OccurrenceType(data_snake["occurrence_type"])
        data_snake["occurrence_info"] = OccurrenceInfo.from_dto(data.occurrenceInfo)
        data_snake["frequency_type"] = FrequencyType(data_snake["frequency_type"])
        data_snake["month_repeat_type"] = (
            MonthRepeatType(data_snake["month_repeat_type"])
            if data_snake["month_repeat_type"]
            else None
        )
        data_snake["recurrence_end_type"] = RecurrenceEndType(
            data_snake["recurrence_end_type"]
        )
        data_snake["start_date"] = datetime.fromtimestamp(
            data_snake["start_date"], timezone.utc
        ).date()
        data_snake["end_date"] = (
            datetime.fromtimestamp(data_snake["end_date"], timezone.utc).date()
            if data_snake["end_date"]
            else None
        )
        data_snake["last_materialized_until"] = (
            datetime.fromtimestamp(
                data_snake["last_materialized_until"], timezone.utc
            ).date()
            if data_snake.get("last_materialized_until")
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
    DELETE_RECURRENCE = 4  # Delete the recurrence rule, keep the current occurrence
