from pydantic import BaseModel


class RotationDTO(BaseModel):
    id: str
    teamId: str
    name: str
    shiftId: str
    workerIds: list[str]
    currentPosition: int
    startDate: float
    endDate: float | None
    lastMaterializedUntil: float | None = None


class RotationCreateDTO(BaseModel):
    name: str
    shiftId: str
    workerIds: list[str]
    startDate: float
    endDate: float | None


class RotationUpdateDTO(BaseModel):
    name: str | None = None
    workerIds: list[str] | None = None
    startDate: float | None = None
    endDate: float | None = None
    currentPosition: int | None = None


class RotationBreakRequestDTO(BaseModel):
    behavior: int
    newWorkerId: str | None = None
