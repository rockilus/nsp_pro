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


class WorkerPropertyMessage(BaseModel):
    id: str
    value: str
    workerDimensionId: str
    workerId: str


class WorkerMessage(BaseModel):
    id: str
    name: str
    workerProperties: List[WorkerPropertyMessage]


class WorkerDimensionMessage(BaseModel):
    id: str
    name: str
    entryType: str
    entryOptions: List[str]


class ShiftPropertyMessage(BaseModel):
    id: str
    value: str
    shiftDimensionId: str
    shiftId: str


class ShiftMessage(BaseModel):
    id: str
    name: str
    shiftProperties: List[ShiftPropertyMessage]


class ShiftDimensionMessage(BaseModel):
    id: str
    name: str
    entryType: str
    entryOptions: List[str]
