from datetime import date, datetime
from typing import List, Tuple, Union

from pydantic import BaseModel


# Coverage
class ShiftDemandMessage(BaseModel):
    id: str
    dayIndex: int
    shiftId: str
    quantity: int
    startTime: datetime
    duration: int
    coverageId: str


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
    id: str
    constraintId: str
    category: str
    variables: List[Tuple[str, date, str]]
    hardToSoft: bool
    description: str


class CommentsMessage(BaseModel):
    constraintBreaches: List[ConstraintBreachMessage]
    missingCoverageDates: List[date]


class ScheduleMessage(BaseModel):
    id: str
    startDate: date
    endDate: date
    status: str
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
    hard: bool
    priority: str
    active: bool


class TreeNodeMessage(BaseModel):
    name: str
    parentOptions: List[str]
    options: List[str]
    children: List["TreeNodeMessage"]


class ScheduleOptionsMessage(BaseModel):
    startDate: date
    endDate: date
