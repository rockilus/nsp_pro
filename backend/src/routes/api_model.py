from datetime import date
from typing import List, Dict, Union

from pydantic import BaseModel


# Coverage
class ShiftDemandMessage(BaseModel):
    dayIndex: int
    shiftId: str
    quantity: int


class CreateCoverageRequest(BaseModel):
    name: str
    shiftDemands: List[ShiftDemandMessage]


class CoverageMessage(BaseModel):
    id: str
    name: str
    shiftDemands: List[ShiftDemandMessage]


class CoverageSelectorMessage(BaseModel):
    id: str
    coverageId: str
    startDate: date
    endDate: date


# Worker
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


# Shift
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


# Schedule
class AssignmentMessage(BaseModel):
    id: str
    workerId: str
    date: date
    shiftId: str
    scheduleId: str


class ConstraintBreachMessage(BaseModel):
    constraintId: str
    workers: List[str]
    dates: List[date]
    shifts: List[str]
    value: int
    penalty: int


class CommentsMessage(BaseModel):
    constraintBreaches: List[ConstraintBreachMessage]
    missingCoverageDates: List[date]


class ScheduleMessage(BaseModel):
    id: str
    startDate: date
    endDate: date
    assignments: List[AssignmentMessage]
    comments: CommentsMessage


# Fixed Assignement
class FixedAssignmentMessage(BaseModel):
    id: str
    workerId: str
    date: date
    shiftId: str
    status: str


# Request
class RequestMessage(BaseModel):
    id: str
    workerId: str
    date: date
    shiftId: str
    priority: str
    status: str


# Constraint
class BuildBlockMessage(BaseModel):
    name: str
    value: Union[str, int]


class ConstraintMessage(BaseModel):
    id: str
    buildBlocks: List[BuildBlockMessage]
    active: bool


class TreeNodeMessage(BaseModel):
    name: str
    parentOptions: List[str]
    options: List[str]
    children: List["TreeNodeMessage"]
