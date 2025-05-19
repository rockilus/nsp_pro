from pydantic import BaseModel


class RequestDTO(BaseModel):
    id: str
    teamId: str
    requestType: str
    workerId: str
    startDate: float
    endDate: float
    shiftId: str
    negative: bool
    hard: bool
    status: str
    fulfillment: str
    comment: str
    createdAt: float
    active: bool
