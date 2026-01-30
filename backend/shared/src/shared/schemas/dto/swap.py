from typing import Dict, List

from pydantic import BaseModel


class SwapBidDTO(BaseModel):
    id: str
    workerId: str
    offeredAssignmentIds: List[str]
    createdAt: float
    accepted: bool


class SwapRequestDTO(BaseModel):
    id: str
    teamId: str
    scheduleId: str | None
    createdByWorkerId: str
    swapType: str
    status: str
    offeredAssignmentIds: List[str]
    requestedAssignmentIds: List[str] | None
    targetWorkerId: str | None
    comment: str
    bids: List[Dict]  # List of SwapBidDTO dicts
    createdAt: float
    completedAt: float | None
    completedByUserId: str | None
    auditData: List[Dict]  # List of SwapAuditData dicts
