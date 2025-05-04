from datetime import date
from typing import Dict, List

from pydantic import BaseModel
from shared.schemas.dto import AttributeDTO


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
    newAttributes: List[AttributeDTO]


# Shift
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


# Team
class SpecialtyMessage(BaseModel):
    id: str
    teamId: str
    name: str
    deleted: bool


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
