from typing import List

from pydantic import BaseModel

from shared.schemas.dto.attribute import AttributeDTO


class StaffingDTO(BaseModel):
    specialtyId: str | None
    staffing: int


class ShiftDTO(BaseModel):
    id: str
    teamId: str
    name: str
    acronym: str
    acronymCustom: bool
    startTime: float
    endTime: float
    staffing: List[StaffingDTO]
    color: str
    shiftType: int
    restType: int
    leaveType: int
    recuperationTime: int
    recuperationDutyId: str | None
    deleted: bool
    attributes: List[AttributeDTO]
