from typing import List

from pydantic import BaseModel

from shared.schemas.dto.breach import BreachDTO


class FilterHitsDTO(BaseModel):
    isntFilteredOut: bool
    filterLabels: List[str]


class OverlapHitsDTO(BaseModel):
    hasntOverlap: bool
    overlapAssignmentIds: List[str]


class ConstraintHitsDTO(BaseModel):
    meetsConstraints: bool
    breaches: List[BreachDTO]


class RequestHitsDTO(BaseModel):
    hasNoRequestConflict: bool
    conflictingRequestIds: List[str]


class MonthlyDutiesImplicationsDTO(BaseModel):
    newNumberMonthlyDuties: int
    newMonthlyDutiesDelta: int
    meetsTarget: bool


class WeeklyWorkTimeImplicationsDTO(BaseModel):
    newWeeklyWorkedMinutes: int
    newWeeklyTimeDeltaMinutes: int
    meetsTarget: bool


class LTMIndicatorDTO(BaseModel):
    count: int
    lastDate: float | None  # Unix timestamp


class ReplacementImplicationsDTO(BaseModel):
    # Can't do (hard constraints)
    isEmployed: bool
    hasSpecialty: bool
    isntOnLeave: bool
    filterHits: FilterHitsDTO
    overlapHits: OverlapHitsDTO
    hardConstraintHits: ConstraintHitsDTO
    requestHits: RequestHitsDTO

    # Could do (soft constraints)
    softConstraintHits: ConstraintHitsDTO
    newMonthlyDuties: MonthlyDutiesImplicationsDTO
    newWeeklyTime: WeeklyWorkTimeImplicationsDTO

    # Indicators (informational)
    nbTimesDidShiftLtm: LTMIndicatorDTO
    nbTimesWorkedWeekdayLtm: LTMIndicatorDTO


class ReplacementCandidateDTO(BaseModel):
    workerId: str
    workerName: str
    rank: int
    replacementCategory: str  # "can_do", "could_do", "cant_do"
    replacementImplications: ReplacementImplicationsDTO
    mostConstrainingReason: str


class AssignmentImplicationDTO(BaseModel):
    assignmentId: str
    implications: ReplacementImplicationsDTO
    replacementCategory: str
    mostConstrainingReason: str


class SwapAssignmentInfoDTO(BaseModel):
    workerId: str
    workerName: str
    preSwap: List[AssignmentImplicationDTO]
    postSwap: List[AssignmentImplicationDTO]


class SwapValidationResultDTO(BaseModel):
    isValid: bool
    workerAInfo: SwapAssignmentInfoDTO
    workerBInfo: SwapAssignmentInfoDTO
    validationKey: str
