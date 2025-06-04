from typing import List

from pydantic import BaseModel

from shared.schemas.dto.constraint import (
    MissingAttributeDTO,
    ShiftWorkerOptionDTO,
)


class RequestDTO(BaseModel):
    id: str
    teamId: str
    requestType: str
    workerId: str
    startDate: float
    endDate: float
    shiftId: str | None
    shiftOptions: List[ShiftWorkerOptionDTO]
    negative: bool
    hard: bool
    status: str
    fulfillment: str
    comment: str
    createdAt: float
    active: bool
    missingAttributes: List[MissingAttributeDTO]
