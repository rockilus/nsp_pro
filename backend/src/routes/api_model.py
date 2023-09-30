from datetime import date
from typing import List

from pydantic import BaseModel


class ShiftDemandMessage(BaseModel):
    dayIndex: int
    shiftId: str
    quantity: int


class CreateCoverageRequest(BaseModel):
    name: str
    dateStart: date
    dateEnd: date
    shiftDemands: List[ShiftDemandMessage]


class CoverageMessage(BaseModel):
    id: str
    name: str
    dateStart: date
    dateEnd: date
    shiftDemands: List[ShiftDemandMessage]
