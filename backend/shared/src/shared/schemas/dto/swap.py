from typing import Dict, List

from pydantic import BaseModel, Field


class SwapBidDTO(BaseModel):
    id: str
    workerId: str
    offeredAssignmentIds: List[str]
    createdAt: float
    accepted: bool


class CreateSwapRequestDTO(BaseModel):
    """Input DTO for creating a new swap request (client-provided fields only)."""

    swapType: str
    offeredAssignmentIds: List[str] = Field(min_length=1)
    requestedAssignmentIds: List[str] | None = None
    targetWorkerId: str | None = None
    comment: str = ""


class SwapRequestDTO(BaseModel):
    id: str
    teamId: str
    scheduleId: str | None
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
