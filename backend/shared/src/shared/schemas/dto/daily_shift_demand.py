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
