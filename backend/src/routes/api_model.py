from datetime import date, datetime
from typing import Dict, List

from pydantic import BaseModel


# Worker
class WorkerPropertyMessage(BaseModel):
    id: str
    value: str | int | bool | List[str]
    workerDimensionId: str
    workerId: str


class WorkerMessage(BaseModel):
    id: str
    teamId: str
    name: str
    workerProperties: List[WorkerPropertyMessage]


class WorkerDimensionMessage(BaseModel):
    id: str
    teamId: str
    name: str
    entryType: str
    entryOptions: List[str]


class NewWorkerDimensionMessage(BaseModel):
    newDimension: WorkerDimensionMessage
    newProperties: List[WorkerPropertyMessage]


# Shift
class ShiftPropertyMessage(BaseModel):
    id: str
    value: str | int | bool | List[str]
    shiftDimensionId: str
    shiftId: str


class ShiftMessage(BaseModel):
    id: str
    teamId: str
    name: str
    startTime: datetime
    endTime: datetime
    isTimeOff: bool
    staffing: int
    color: str
    shiftProperties: List[ShiftPropertyMessage]


class ShiftDefaultMessage(BaseModel):
    id: str
    name: str
    startTime: datetime
    endTime: datetime
    isTimeOff: bool
    staffing: int
    color: str


class ShiftDimensionMessage(BaseModel):
    id: str
    teamId: str
    name: str
    entryType: str
    entryOptions: List[str]


class NewShiftDimensionMessage(BaseModel):
    newDimension: ShiftDimensionMessage
    newProperties: List[ShiftPropertyMessage]


# Coverage
class ShiftDemandMessage(BaseModel):
    id: str
    dayIndex: int
    shift: ShiftDefaultMessage
    coverageId: str


class CoverageMessage(BaseModel):
    id: str
    teamId: str
    name: str
    shiftDemands: List[ShiftDemandMessage]


class CoverageSelectorMessage(BaseModel):
    id: str
    teamId: str
    coverageId: str
    startDate: date
    endDate: date


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
class BlockMessage(BaseModel):
    name: str
    type: str
    value: str | int | List[str] | List[Dict]


class MissingPropertyMessage(BaseModel):
    dimensionId: str
    propertyValues: List[str]


class ConstraintBuildMessage(BaseModel):
    id: str
    teamId: str
    constraintType: str
    templateId: str
    blocks: List[BlockMessage]
    text: str
    hard: bool
    priority: str
    active: bool
    missingProperties: List[MissingPropertyMessage]


class TemplateBlockMessage(BaseModel):
    name: str
    type: str
    options: List[str] | Dict
    placeholder: str | int


class TemplateMessage(BaseModel):
    id: str
    constraintType: str
    text: str
    blocks: List[TemplateBlockMessage]


# Schedule
class AssignmentMessage(BaseModel):
    id: str
    workerId: str
    date: date
    shiftId: str
    scheduleId: str
    status: str


class StatMessage(BaseModel):
    workerId: str
    name: str
    cluster: str
    value: int | float


class StatsOptionsMessage(BaseModel):
    id: str
    teamId: str
    startDate: date
    endDate: date


class StatsMessage(BaseModel):
    statsOptions: StatsOptionsMessage | None
    stats: List[StatMessage]


class VariableMessage(BaseModel):
    workerId: str
    date: date
    shiftId: str


class ObjectiveBreachMessage(BaseModel):
    id: str
    objectiveId: str
    objectiveCategory: str  # constraint, request, fixed assignment, coverage?
    variables: List[VariableMessage]
    hardToSoft: bool
    description: str
    scheduleId: str


class ScheduleMessage(BaseModel):
    id: str
    teamId: str
    startDate: date
    endDate: date
    solveStatus: str
    status: str
    missingCoverageDates: List[date]


class SolutionMessage(BaseModel):
    schedule: ScheduleMessage
    assignments: List[AssignmentMessage]
    objectiveBreaches: List[ObjectiveBreachMessage]
    stats: List[StatMessage]


class ValidateMessage(BaseModel):
    schedule: ScheduleMessage
    assignments: List[AssignmentMessage]


# Authentication
class Token(BaseModel):  # can be deleted
    access_token: str
    token_type: str


class User(BaseModel):
    id: str
    username: str
    firstName: str
    lastName: str


# Team
class TeamMessage(BaseModel):
    id: str
    # team_members: List[str]
    # team_leaders: List[str]


# Health
class HealthCheck(BaseModel):
    status: str
