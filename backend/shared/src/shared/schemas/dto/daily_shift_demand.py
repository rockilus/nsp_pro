from typing import List

from pydantic import BaseModel


class DailyShiftDemandDTO(BaseModel):
    id: str
    teamId: str
    scheduleId: str
    shiftDemandId: str | None
    coverageSelectorId: str | None
    sourceType: int
    date: float
    shiftId: str
    count: int


class DeleteDailyShiftDemandRequestDTO(BaseModel):
    teamId: str
    shiftId: str
    date: float


class DemandsResultDTO(BaseModel):
    demandsCreated: List[DailyShiftDemandDTO]
    demandsRead: List[DailyShiftDemandDTO]
    demandsUpdated: List[DailyShiftDemandDTO]
    demandsDeletedIds: List[str]
