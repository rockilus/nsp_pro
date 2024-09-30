from datetime import date, datetime
from typing import List

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
    weeklyHours: int
    weeklyHoursDesired: int
    dutiesPerMonth: int
    annualLeave: int
    deleted: bool
    workerProperties: List[WorkerPropertyMessage]


class WorkerDimensionMessage(BaseModel):
    id: str
    teamId: str
    name: str
    entryType: str
    entryOptions: List[str]
    deleted: bool


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
    staffing: int
    color: str
    shiftType: int
    restType: int
    leaveType: int
    recuperationTime: int
    recuperationDutyId: str | None
    deleted: bool
    shiftProperties: List[ShiftPropertyMessage]


class DimEntryMessage(BaseModel):
    id: str
    dimensionId: str
    name: str


class DimensionMessage(BaseModel):
    id: str
    teamId: str
    type: int
    name: str
    entryType: int
    restShift: bool
    deleted: bool


class NewDimensionMessage(BaseModel):
    newDimension: DimensionMessage
    newProperties: List[WorkerPropertyMessage] | List[ShiftPropertyMessage]


# Coverage
class ShiftDemandMessage(BaseModel):
    id: str
    dayIndex: int
    shift: ShiftMessage
    coverageId: str


class CoverageMessage(BaseModel):
    id: str
    teamId: str
    name: str
    shiftDemands: List[ShiftDemandMessage]


class CoverageSelectorMessage(BaseModel):
    id: str
    scheduleId: str
    coverageId: str
    fullPeriod: bool
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
    startDate: date
    endDate: date
    shiftId: str
    hard: bool
    status: str
    active: bool


# Constraint
class ShiftWorkerOptionMessage(BaseModel):
    name: str | bool
    id: str
    idType: str
    isBoolDim: bool
    categoryName: str


class BlockMessage(BaseModel):
    name: str
    type: str
    value: str | int | List[str] | List[ShiftWorkerOptionMessage]


class MissingPropertyMessage(BaseModel):
    dimensionId: str
    isBool: bool
    dimName: str
    category: str
    propertyValues: List[str | int | float | bool]


class ConstraintBuildMessage(BaseModel):
    id: str
    teamId: str
    constraintType: str
    templateId: str
    language: str
    blocks: List[BlockMessage]
    text: str
    hard: bool
    priority: str
    active: bool
    missingProperties: List[MissingPropertyMessage]


class TemplateBlockMessage(BaseModel):
    name: str
    type: str
    options: List[str] | List[ShiftWorkerOptionMessage]
    placeholder: str | int


class TemplateMessage(BaseModel):
    id: str
    constraintType: str
    text: str
    language: str
    blocks: List[TemplateBlockMessage]


# Schedule
class AssignmentMessage(BaseModel):
    id: str
    workerId: str
    date: date
    shiftId: str
    scheduleId: str
    status: str
    fixed: bool


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


class QuickStaffingMessage(BaseModel):
    workerId: str
    shiftId: str
    target: int


class ScheduleMessage(BaseModel):
    id: str
    teamId: str
    startDate: date
    endDate: date
    solveStatus: str
    status: str
    missingCoverageDates: List[date]
    constraintBuildIds: List[str]
    quickStaffings: List[QuickStaffingMessage]


class SolutionMessage(BaseModel):
    schedule: ScheduleMessage
    assignments: List[AssignmentMessage]
    objectiveBreaches: List[ObjectiveBreachMessage]
    requests: List[RequestMessage]


class ValidateMessage(BaseModel):
    schedule: ScheduleMessage
    assignments: List[AssignmentMessage]


# Stats
class StatsHeaderMessage(BaseModel):
    id: str
    teamId: str
    statsUnit: str
    headerUnit: str
    value: str
    selectedShifts: List[ShiftWorkerOptionMessage]
    inCustom: bool


class StatsValueMessage(BaseModel):
    workerId: str
    headerId: str
    value: int | float


class StatsMessage(BaseModel):
    statsHeaders: List[StatsHeaderMessage]
    statsValues: List[StatsValueMessage]


class StatsOptionsMessage(BaseModel):
    timeFrame: str
    startDate: date
    endDate: date
    statsUnit: str
    headerUnit: str
    selectedShifts: List[ShiftWorkerOptionMessage]


# User
class UserMessage(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    workers: List[str]
    language: str
    signUpAt: datetime


class PasswordDataMessage(BaseModel):
    currentPassword: str
    newPassword: str
    newPasswordConfirm: str


# Team
class TeamMessage(BaseModel):
    id: str
    # team_members: List[str]
    # team_leaders: List[str]


# Health
class HealthCheck(BaseModel):
    status: str
