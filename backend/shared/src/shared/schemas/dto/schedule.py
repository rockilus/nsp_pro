from typing import List

from pydantic import BaseModel

from shared.schemas.dto.assignment import AssignmentsRecurrencesResultDTO
from shared.schemas.dto.shift_demand_new import ShiftDemandsResultDTO


class QuickStaffingDTO(BaseModel):
    workerId: str
    shiftId: str
    target: int


class ScheduleDTO(BaseModel):
    id: str
    teamId: str
    startDate: float
    endDate: float
    status: int
    missingCoverageDates: List[float]
    constraintBuildIds: List[str]
    quickStaffings: List[QuickStaffingDTO]
    createdAt: float
    updatedAt: float
    createdBy: str


class PeriodDTO(BaseModel):
    startDate: float
    endDate: float


class DuplicateOptionsDTO(BaseModel):
    copyAssignments: bool
    copyDemands: bool


#     copyTasks: bool
#     copyNotes: bool
#     overwriteExisting: bool


class DuplicateRequestDTO(BaseModel):
    sourcePeriod: PeriodDTO
    targetPeriod: PeriodDTO
    options: DuplicateOptionsDTO


class DuplicateResultDTO(BaseModel):
    assignments: AssignmentsRecurrencesResultDTO | None
    demands: ShiftDemandsResultDTO | None


class WorkTimeTableDataDTO(BaseModel):
    hours: int
    count: int


class WorkTimeTableDTO(BaseModel):
    duties: WorkTimeTableDataDTO
    others: WorkTimeTableDataDTO
    workers: WorkTimeTableDataDTO
    nbWeeks: float
