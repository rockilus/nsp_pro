from typing import Dict, List

from pydantic import BaseModel, ConfigDict, Field


class SwapBidDTO(BaseModel):
    id: str
    workerId: str
    offeredAssignmentIds: List[str]
    createdAt: float
    accepted: bool
    obsolete: bool = False


class CreateSwapRequestDTO(BaseModel):
    """Input DTO for creating a new swap request (client-provided fields only)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "swapType": "shift_swap",
                "offeredAssignmentIds": ["assignment-1"],
                "requestedAssignmentIds": None,
                "targetWorkerId": None,
                "comment": "Need to swap this shift",
            }
        }
    )

    swapType: str = Field(examples=["shift_swap"])
    offeredAssignmentIds: List[str] = Field(min_length=1, examples=[["assignment-1"]])
    requestedAssignmentIds: List[str] | None = None
    targetWorkerId: str | None = None
    comment: str = ""


class AddBidRequestDTO(BaseModel):
    """Input DTO for adding a bid to an open swap."""

    bidderWorkerId: str
    offeredAssignmentIds: List[str] = Field(min_length=1)


class SwapRequestDTO(BaseModel):
    id: str
    teamId: str
    createdByUserId: str
    swapType: str
    status: str
    offeredAssignmentIds: List[str]
    requestedAssignmentIds: List[str] | None
    targetWorkerId: str | None
    comment: str
    offeringWorkerId: str = ""
    bids: List[Dict]  # List of SwapBidDTO dicts
    createdAt: float
    completedAt: float | None
    completedByUserId: str | None
    revertedAt: float | None
    revertedByUserId: str | None
    auditData: List[Dict]  # List of SwapAuditData dicts
    obsolete: bool = False
