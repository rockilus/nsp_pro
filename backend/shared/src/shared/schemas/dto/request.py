from pydantic import BaseModel


class RequestDTO(BaseModel):
    id: str
    teamId: str
    workerId: str
    startDate: float
    endDate: float
    shiftId: str
    negative: bool
    hard: bool
    status: int
    active: bool
