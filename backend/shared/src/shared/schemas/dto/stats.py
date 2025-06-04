from datetime import date
from typing import List

from pydantic import BaseModel

from shared.schemas.dto.constraint import ShiftWorkerOptionDTO


class StatsHeaderDTO(BaseModel):
    id: str
    teamId: str
    statsUnit: int
    headerUnit: int
    value: str
    selectedShifts: List[ShiftWorkerOptionDTO]
    isFavorite: bool


class StatsValueDTO(BaseModel):
    workerId: str
    headerId: str
    value: int | float


class StatsDTO(BaseModel):
    statsHeaders: List[StatsHeaderDTO]
    statsValues: List[StatsValueDTO]


class StatsOptionsDTO(BaseModel):
    timeFrame: int
    startDate: date
    endDate: date
    statsUnit: int
    headerUnit: int
    selectedShifts: List[ShiftWorkerOptionDTO]
    showFavorites: bool
