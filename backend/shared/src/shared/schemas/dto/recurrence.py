from pydantic import BaseModel
from datetime import date


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
    startDate: str
    endDate: str | None
    numberOfOccurrences: int | None
