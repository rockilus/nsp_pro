from typing import List, Optional

from pydantic import BaseModel

from shared.schemas.dto.attribute import AttributeDTO


class WeeklySlotPreferenceDTO(BaseModel):
    dayOfWeek: int
    slot: str
    restriction: str
    shiftIds: List[str] = []
    weekParity: str = "all"


class WeeklyPreferencesDTO(BaseModel):
    enabled: bool = False
    slots: List[WeeklySlotPreferenceDTO] = []


class WorkerDTO(BaseModel):
    id: str
    teamId: str
    name: str
    acronym: str
    acronymCustom: bool
    employmentStartDate: float
    employmentEndDate: float | None
    weeklyHours: int
    weeklyHoursDesired: int
    dutiesPerMonth: int
    annualLeave: int
    deleted: bool
    specialtyIds: List[str]
    userId: str | None
    attributes: List[AttributeDTO]
    weeklyPreferences: Optional[WeeklyPreferencesDTO] = None
