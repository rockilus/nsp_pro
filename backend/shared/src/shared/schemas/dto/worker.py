from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

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
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "worker-1",
                "teamId": "64e9b7f1e13e4a1a9c8b4567",
                "name": "Jane Smith",
                "acronym": "JS",
                "acronymCustom": False,
                "employmentStartDate": 1700000000.0,
                "employmentEndDate": None,
                "weeklyHours": 40,
                "weeklyHoursDesired": 36,
                "dutiesPerMonth": 10,
                "annualLeave": 25,
                "deleted": False,
                "specialtyIds": ["specialty-1"],
                "userId": None,
                "attributes": [],
                "weeklyPreferences": None,
            }
        }
    )

    id: str
    teamId: str
    name: str
    acronym: str
    acronymCustom: bool = Field(examples=[False])
    employmentStartDate: float = Field(examples=[1700000000.0])
    employmentEndDate: float | None
    weeklyHours: int = Field(examples=[40])
    weeklyHoursDesired: int = Field(examples=[36])
    dutiesPerMonth: int = Field(examples=[10])
    annualLeave: int = Field(examples=[25])
    deleted: bool = Field(examples=[False])
    specialtyIds: List[str] = Field(examples=[["specialty-1"]])
    userId: str | None
    attributes: List[AttributeDTO]
    weeklyPreferences: Optional[WeeklyPreferencesDTO] = None
