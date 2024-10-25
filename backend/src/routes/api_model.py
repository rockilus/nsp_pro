from datetime import date, datetime
from typing import List

from pydantic import BaseModel


# Attribute
class AttributeMessage(BaseModel):
    id: str
    value: str | int | bool
    ownerType: int
    ownerId: str
    dimensionId: str
    dimEntryIds: List[str]


# Dimension
class DimEntryMessage(BaseModel):
    id: str
    dimensionId: str
    name: str
    deleted: bool


class DimensionMessage(BaseModel):
    id: str
    teamId: str
    dimTypes: List[int]
    name: str
    entryType: int
    deleted: bool


class DimensionsAndDimEntriesMessage(BaseModel):
    dimensions: List[DimensionMessage]
    dimEntries: List[DimEntryMessage]


class NewDimensionMessage(BaseModel):
    newDimension: DimensionMessage
    newDimEntries: List[DimEntryMessage]
    newAttributes: List[AttributeMessage]


# Worker
class WorkerMessage(BaseModel):
    id: str
    teamId: str
    name: str
    employmentStartDate: float
    employmentEndDate: float | None
    weeklyHours: int
    weeklyHoursDesired: int
    dutiesPerMonth: int
    annualLeave: int
    deleted: bool
    specialtyIds: List[str]
    attributes: List[AttributeMessage]


# Shift
class StaffingMessage(BaseModel):
    specialtyId: str | None
    staffing: int


class ShiftMessage(BaseModel):
    id: str
    teamId: str
    name: str
    startTime: float
    endTime: float
    staffing: List[StaffingMessage]
    color: str
    shiftType: int
    restType: int
    leaveType: int
    recuperationTime: int
    recuperationDutyId: str | None
    deleted: bool
    attributes: List[AttributeMessage]


# Coverage
class ShiftDemandMessage(BaseModel):
    id: str
    dayIndex: int
    shiftId: str
    coverageId: str


class CoverageMessage(BaseModel):
    id: str
    teamId: str
    name: str


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


class MissingAttributeMessage(BaseModel):
    dimensionId: str
    isBool: bool
    dimName: str
    category: str
    attributeValues: List[str | int | float | bool]


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
    missingAttributes: List[MissingAttributeMessage]


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


class DailyShiftDemandMessage(BaseModel):
    id: str
    teamId: str
    scheduleId: str
    shiftDemandId: str | None
    sourceType: int
    date: float
    shiftId: str
    count: int


class VariableMessage(BaseModel):
    workerId: str
    date: float
    shiftId: str


class BreachMessage(BaseModel):
    id: str
    scheduleId: str
    objectiveId: str | None
    objectiveCategory: int
    variables: List[VariableMessage]
    description: str
    hardToSoft: bool | None


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
    objectiveBreaches: List[BreachMessage]
    requests: List[RequestMessage]
    recuperationShiftsNew: List[ShiftMessage]


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
class SpecialtyMessage(BaseModel):
    id: str
    teamId: str
    name: str
    deleted: bool


class TeamMessage(BaseModel):
    id: str
    # team_members: List[str]
    # team_leaders: List[str]


# Health
class HealthCheck(BaseModel):
    status: str
