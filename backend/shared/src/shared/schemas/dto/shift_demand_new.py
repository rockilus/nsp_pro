from typing import List

from pydantic import BaseModel


class ShiftDemandNewCreateDTO(BaseModel):
    """DTO for creating new shift demands - excludes server-managed fields."""

    date: float
    shiftId: str
    teamId: str
    count: int
    notes: str | None = None
    source: str = "manual"
    sourceId: str | None = None


class ShiftDemandNewUpdateDTO(BaseModel):
    """DTO for updating shift demands - allows partial updates."""

    date: float | None = None
    shiftId: str | None = None
    teamId: str | None = None
    count: int | None = None
    notes: str | None = None
    source: str | None = None
    sourceId: str | None = None


class ShiftDemandNewDTO(BaseModel):
    """DTO for shift demand data responses - includes all fields."""

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
