from typing import List, Optional

from pydantic import BaseModel, Field

from shared.schemas.dto.assignment import AssignmentDTO
from shared.schemas.dto.breach import BreachDTO
from shared.schemas.dto.request import RequestDTO


class ResultModelDTO(BaseModel):
    assignments: List[AssignmentDTO]
    breaches: List[BreachDTO]
    requests: List[RequestDTO]


class SolveTaskStatusResponseDTO(BaseModel):
    id: Optional[str] = Field(default=None)
    solveId: str
    scheduleId: str
    teamId: str
    userId: str
    requestStatus: str
    solveStatus: str
    startedAt: Optional[float] = None
    completedAt: Optional[float] = None
    errorMessage: Optional[str] = None
    result: Optional[ResultModelDTO] = None
