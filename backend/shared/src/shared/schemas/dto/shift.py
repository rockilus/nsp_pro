from typing import List

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas.dto.attribute import AttributeDTO


class StaffingDTO(BaseModel):
    specialtyId: str | None
    staffing: int


class ShiftDTO(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "shift-1",
                "teamId": "64e9b7f1e13e4a1a9c8b4567",
                "name": "Morning Shift",
                "acronym": "AM",
                "acronymCustom": False,
                "startTime": 28800.0,
                "endTime": 61200.0,
                "staffing": [{"specialtyId": "specialty-1", "staffing": 2}],
                "color": "#4A90D9",
                "shiftType": 1,
                "restType": 0,
                "leaveType": 0,
                "recuperationTime": 0,
                "recuperationDutyId": None,
                "deleted": False,
                "attributes": [],
            }
        }
    )

    id: str
    teamId: str
    name: str
    acronym: str
    acronymCustom: bool = Field(examples=[False])
    startTime: float = Field(examples=[28800.0])
    endTime: float = Field(examples=[61200.0])
    staffing: List[StaffingDTO]
    color: str
    shiftType: int = Field(examples=[1])
    restType: int = Field(examples=[0])
    leaveType: int = Field(examples=[0])
    recuperationTime: int = Field(examples=[0])
    recuperationDutyId: str | None
    deleted: bool = Field(examples=[False])
    useCustomWorkTime: bool = False
    customWorkTimeMinutes: int = 0
    attributes: List[AttributeDTO]
