from pydantic import BaseModel


class RecurrenceRuleDTO(BaseModel):
    id: str
    teamId: str
    recurrenceType: int
    assignmentId: str | None
    dailyShiftDemandId: str | None
    repeatEvery: int
    frequencyType: int
    weekDays: list[int]
    monthRepeatType: int | None
    recurrenceEndType: int
    startDate: float
    endDate: float | None
    numberOfOccurrences: int | None
