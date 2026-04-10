from dataclasses import asdict, dataclass
from datetime import date
from enum import Enum
from typing import List

import humps
from pydantic import TypeAdapter

from shared.schemas.core.constraint import ShiftWorkerOption
from shared.schemas.dto.stats import (
    StatsDTO,
    StatsHeaderDTO,
    StatsOptionsDTO,
    StatsValueDTO,
)


class StatsTimeFrameOptions(Enum):
    CAMPAING = 0
    LTM = 1
    CUSTOM = 2


class StatsUnitOptions(Enum):
    # FAVORITES = 0
    NB_DAYS_WORKED = 0
    TIME_WORKED = 1
    NB_SHIFTS_WORKED = 2
    NB_REST_DAYS = 3
    NB_REST_SHIFTS = 4
    NB_TIMES_SHIFT = 5
    NB_TIMES_REST = 6


class HeaderUnitOptions(Enum):
    WEEKDAY = 0
    WEEK = 1
    MONTH = 2
    YEAR = 3
    ALL = 4
    SHIFT = 5


@dataclass
class StatsHeader:
    id: str
    team_id: str
    stats_unit: StatsUnitOptions
    header_unit: HeaderUnitOptions
    value: str  # weekday index, week number, month number, year number, shift_id
    selected_shifts: List[ShiftWorkerOption]
    is_favorite: bool

    def to_dto(self) -> StatsHeaderDTO:
        data = asdict(self)
        data["statsUnit"] = self.stats_unit.value
        data["headerUnit"] = self.header_unit.value
        data["selectedShifts"] = [shift.to_dto() for shift in self.selected_shifts]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(StatsHeaderDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: StatsHeaderDTO) -> "StatsHeader":
        data_snake = humps.decamelize(dto.model_dump())
        data_snake["stats_unit"] = StatsUnitOptions(data_snake["stats_unit"])
        data_snake["header_unit"] = HeaderUnitOptions(data_snake["header_unit"])
        data_snake["selected_shifts"] = [
            ShiftWorkerOption.from_dto(shift) for shift in dto.selectedShifts
        ]
        return cls(**data_snake)


@dataclass
class StatsValue:
    worker_id: str
    header_id: str
    value: int | float

    def to_dto(self) -> StatsValueDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(StatsValueDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: StatsValueDTO) -> "StatsValue":
        data_snake = humps.decamelize(dto.model_dump())
        return cls(**data_snake)


@dataclass
class Stats:
    stats_headers: List[StatsHeader]
    stats_values: List[StatsValue]

    def to_dto(self) -> StatsDTO:
        data = asdict(self)
        data["statsHeaders"] = [header.to_dto() for header in self.stats_headers]
        data["statsValues"] = [value.to_dto() for value in self.stats_values]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(StatsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: StatsDTO) -> "Stats":
        data_snake = humps.decamelize(dto.model_dump())
        data_snake["stats_headers"] = [
            StatsHeader.from_dto(header) for header in dto.statsHeaders
        ]
        data_snake["stats_values"] = [
            StatsValue.from_dto(value) for value in dto.statsValues
        ]
        return cls(**data_snake)


@dataclass
class StatsOptions:
    time_frame: StatsTimeFrameOptions
    start_date: date
    end_date: date
    stats_unit: StatsUnitOptions
    header_unit: HeaderUnitOptions
    selected_shifts: List[ShiftWorkerOption]
    show_favorites: bool

    def to_dto(self) -> StatsOptionsDTO:
        data = asdict(self)
        data["timeFrame"] = self.time_frame.value
        data["statsUnit"] = self.stats_unit.value
        data["headerUnit"] = self.header_unit.value
        data["selectedShifts"] = [shift.to_dto() for shift in self.selected_shifts]
        as_dict = humps.camelize(data)
        validator = TypeAdapter(StatsOptionsDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, dto: StatsOptionsDTO) -> "StatsOptions":
        data_snake = humps.decamelize(dto.model_dump())
        data_snake["time_frame"] = StatsTimeFrameOptions(data_snake["time_frame"])
        data_snake["stats_unit"] = StatsUnitOptions(data_snake["stats_unit"])
        data_snake["header_unit"] = HeaderUnitOptions(data_snake["header_unit"])
        data_snake["selected_shifts"] = [
            ShiftWorkerOption.from_dto(shift) for shift in dto.selectedShifts
        ]
        return cls(**data_snake)
