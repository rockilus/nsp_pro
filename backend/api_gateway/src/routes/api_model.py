from datetime import date

from pydantic import BaseModel


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
