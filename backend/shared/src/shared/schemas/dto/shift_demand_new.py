from typing import List

from pydantic import BaseModel, ConfigDict, Field


class ShiftDemandNewCreateDTO(BaseModel):
    """DTO for creating new shift demands - excludes server-managed fields."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "date": 1700000000.0,
                "shiftId": "shift-1",
                "teamId": "64e9b7f1e13e4a1a9c8b4567",
                "count": 2,
                "notes": None,
                "source": "manual",
                "sourceId": None,
            }
        }
    )

    date: float = Field(examples=[1700000000.0])
    shiftId: str = Field(examples=["shift-1"])
    teamId: str = Field(examples=["64e9b7f1e13e4a1a9c8b4567"])
    count: int = Field(examples=[2])
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
