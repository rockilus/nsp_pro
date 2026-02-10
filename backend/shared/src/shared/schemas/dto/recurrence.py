from pydantic import BaseModel


class OccurrenceInfoDTO(BaseModel):
    workerId: str | None
    shiftId: str | None
    count: int | None


class RecurrenceRuleDTO(BaseModel):
    id: str
    teamId: str
    occurrenceType: int
    occurrenceInfo: OccurrenceInfoDTO
    repeatEvery: int
    frequencyType: int
    weekDays: list[int]
    monthRepeatType: int | None
    recurrenceEndType: int
    startDate: float
    endDate: float | None
    numberOfOccurrences: int | None
    lastMaterializedUntil: float | None = None
