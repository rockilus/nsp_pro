from datetime import date, datetime
from typing import Dict, List

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
    acronym: str
    acronymCustom: bool
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
    acronym: str
    acronymCustom: bool
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


class LinkShiftMessage(BaseModel):
    id: str
    teamId: str
    shiftIds: List[str]


# Coverage
class ShiftDemandMessage(BaseModel):
    id: str
    dayIndex: int
    shiftId: str
    coverageId: str
    lastModified: float


class CoverageMessage(BaseModel):
    id: str
    teamId: str
    name: str


class CoverageSelectorMessage(BaseModel):
    id: str
    scheduleId: str
    coverageId: str | None
    fullPeriod: bool
    startDate: date
    endDate: date
    lastModified: float


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
    teamId: str
    workerId: str
    startDate: float
    endDate: float
    shiftId: str
    negative: bool
    hard: bool
    status: int
    active: bool


# Constraint
class ShiftWorkerOptionMessage(BaseModel):
    name: str | bool
    id: str
    idType: int
    isBoolDim: bool
    categoryName: str


class BlockMessage(BaseModel):
    name: int
    type: int
    value: str | int | List[str] | List[ShiftWorkerOptionMessage]


class MissingAttributeMessage(BaseModel):
    dimensionId: str
    isBool: bool
    dimName: str
    category: int
    attributeValues: List[str | int | float | bool]


class ConstraintBuildMessage(BaseModel):
    id: str
    teamId: str
    constraintType: int
    templateId: str
    language: str
    blocks: List[BlockMessage]
    text: str
    hard: bool
    priority: str
    active: bool
    missingAttributes: List[MissingAttributeMessage]


class TemplateBlockMessage(BaseModel):
    name: int
    type: int
    options: List[str] | List[ShiftWorkerOptionMessage]
    placeholder: str | int


class TemplateMessage(BaseModel):
    id: str
    constraintType: int
    text: str
    language: str
    blocks: List[TemplateBlockMessage]


# Schedule
class AssignmentMessage(BaseModel):
    id: str
    teamId: str
    scheduleId: str | None
    workerId: str
    date: float
    shiftId: str
    fixed: bool


class DailyShiftDemandMessage(BaseModel):
    id: str
    teamId: str
    scheduleId: str
    shiftDemandId: str | None
    coverageSelectorId: str | None
    sourceType: int
    date: float
    shiftId: str
    count: int


class VariableMessage(BaseModel):
    workerId: str | None
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


class SolveDetailsMessage(BaseModel):
    taskId: str
    status: int
    updatedAt: float
    result: Dict | None


class ScheduleMessage(BaseModel):
    id: str
    teamId: str
    startDate: float
    endDate: float
    lastModifiedDates: float
    solveDetails: SolveDetailsMessage | None
    solveStatus: int
    status: int
    missingCoverageDates: List[float]
    constraintBuildIds: List[str]
    quickStaffings: List[QuickStaffingMessage]
    lastUpdatedDsds: float | None


class SolutionMessage(BaseModel):
    schedule: ScheduleMessage
    assignments: List[AssignmentMessage]
    breaches: List[BreachMessage]
    requests: List[RequestMessage]


class WorkTimeTableDataMessage(BaseModel):
    hours: int
    count: int


class WorkTimeTableMessage(BaseModel):
    duties: WorkTimeTableDataMessage
    others: WorkTimeTableDataMessage
    workers: WorkTimeTableDataMessage
    nbWeeks: float


# Stats
class StatsHeaderMessage(BaseModel):
    id: str
    teamId: str
    statsUnit: int
    headerUnit: int
    value: str
    selectedShifts: List[ShiftWorkerOptionMessage]
    isFavorite: bool


class StatsValueMessage(BaseModel):
    workerId: str
    headerId: str
    value: int | float


class StatsMessage(BaseModel):
    statsHeaders: List[StatsHeaderMessage]
    statsValues: List[StatsValueMessage]


class StatsOptionsMessage(BaseModel):
    timeFrame: int
    startDate: date
    endDate: date
    statsUnit: int
    headerUnit: int
    selectedShifts: List[ShiftWorkerOptionMessage]
    showFavorites: bool


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


class UserAuthMessage(BaseModel):
    id: str
    email: str


class UserDashboardMessage(BaseModel):
    user: UserMessage | None
    userAuthn: UserAuthMessage | None
    userAuthz: UserAuthMessage | None


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


# Export
class ExportOptionsMessage(BaseModel):
    periodOption: int
    startDate: float
    endDate: float


# Health
# class HealthCheck(BaseModel):
#     status: str


class ServiceStatus(BaseModel):
    status: str
    details: str | None


class HealthCheck(BaseModel):
    status: str
    services: Dict[str, ServiceStatus]
