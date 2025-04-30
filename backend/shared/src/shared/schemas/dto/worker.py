from typing import List

from pydantic import BaseModel

from shared.schemas.dto.attribute import AttributeDTO


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
