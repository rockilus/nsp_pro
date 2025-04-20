from typing import List

from pydantic import BaseModel


class VariableDTO(BaseModel):
    workerId: str | None
    date: float
    shiftId: str


class BreachDTO(BaseModel):
    id: str
    scheduleId: str
    objectiveId: str | None
    objectiveCategory: int
    variables: List[VariableDTO]
    description: str
    hardToSoft: bool | None
