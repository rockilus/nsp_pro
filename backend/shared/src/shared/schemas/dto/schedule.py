from typing import Dict, List

from pydantic import BaseModel

from shared.schemas.dto.assignment import AssignmentDTO
from shared.schemas.dto.breach import BreachDTO
from shared.schemas.dto.request import RequestDTO


class QuickStaffingDTO(BaseModel):
    workerId: str
    shiftId: str
    target: int


class SolveDetailsDTO(BaseModel):
    taskId: str
    status: int
    updatedAt: float
    result: Dict | None


class ScheduleDTO(BaseModel):
    id: str
    teamId: str
    startDate: float
    endDate: float
    lastModifiedDates: float
    solveDetails: SolveDetailsDTO | None
    solveStatus: int
    status: int
    missingCoverageDates: List[float]
    constraintBuildIds: List[str]
    quickStaffings: List[QuickStaffingDTO]
    lastUpdatedDsds: float | None


class SolutionDTO(BaseModel):
    schedule: ScheduleDTO
    assignments: List[AssignmentDTO]
    breaches: List[BreachDTO]
    requests: List[RequestDTO]


class PeriodDTO(BaseModel):
    startDate: float
    endDate: float


class DuplicateOptionsDTO(BaseModel):
    occurrenceType: int


#     copyTasks: bool
#     copyNotes: bool
#     overwriteExisting: bool


class DuplicateRequestDTO(BaseModel):
    sourcePeriod: PeriodDTO
    targetPeriod: PeriodDTO
    options: DuplicateOptionsDTO
