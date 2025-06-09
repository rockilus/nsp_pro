from typing import List

from pydantic import BaseModel


class ShiftDemandNewDTO(BaseModel):
    """DTO for shift demand data."""

    id: str | None
    date: float
    shiftId: str
    teamId: str
    count: int
    notes: str | None
    source: str
    sourceId: str | None
    createdAt: float
    updatedAt: float


class ShiftDemandsResultDTO(BaseModel):
    """DTO for batch operations result on shift demands."""

    demandsCreated: List[ShiftDemandNewDTO]
    demandsRead: List[ShiftDemandNewDTO]
    demandsUpdated: List[ShiftDemandNewDTO]
    demandsDeletedIds: List[str]
