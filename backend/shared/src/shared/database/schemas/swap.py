"""Swap request schema for database validation."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core import (
    SwapAuditData,
    SwapBid,
    SwapRequest,
    SwapStatus,
    SwapType,
)


class SwapRequestSchema(DocumentBaseSchema):
    """Swap request schema for validation."""

    team: str
    created_by_user: str
    swap_type: str
    status: str
    offered_assignment_ids: List[str]
    requested_assignment_ids: Optional[List[str]] = None
    target_worker: Optional[str] = None
    comment: str
    offering_worker: Optional[str] = None
    bids: List[Dict[str, Any]]  # List of bid dictionaries
    created_at: float
    completed_at: Optional[float] = None
    completed_by_user: Optional[str] = None
    reverted_at: Optional[float] = None
    reverted_by_user: Optional[str] = None
    audit_data: List[Dict[str, Any]]  # List of audit data dictionaries

    def to_mongo(self) -> Dict[str, Any]:
        out = super().to_mongo()
        return out

    @classmethod
    def from_mongo(cls, data: Dict[str, Any]) -> "SwapRequestSchema":
        data["id"] = str(data.pop("_id"))
        return cls(**data)

    def to_core(self) -> SwapRequest:
        doc_dict = self.to_mongo()
        doc_dict["id"] = doc_dict.pop("_id")
        doc_dict["team_id"] = doc_dict.pop("team")
        doc_dict["created_by_user_id"] = doc_dict.pop("created_by_user")
        doc_dict["swap_type"] = SwapType(doc_dict["swap_type"])
        doc_dict["status"] = SwapStatus(doc_dict["status"])
        doc_dict["target_worker_id"] = doc_dict.pop("target_worker", None)
        doc_dict["offering_worker_id"] = doc_dict.pop("offering_worker", "") or ""
        doc_dict["completed_by_user_id"] = doc_dict.pop("completed_by_user", None)
        doc_dict["reverted_by_user_id"] = doc_dict.pop("reverted_by_user", None)

        # Convert timestamps to datetime with UTC timezone
        doc_dict["created_at"] = datetime.fromtimestamp(
            doc_dict["created_at"], tz=timezone.utc
        )
        if doc_dict.get("completed_at") is not None:
            doc_dict["completed_at"] = datetime.fromtimestamp(
                doc_dict["completed_at"], tz=timezone.utc
            )
        if doc_dict.get("reverted_at") is not None:
            doc_dict["reverted_at"] = datetime.fromtimestamp(
                doc_dict["reverted_at"], tz=timezone.utc
            )

        # Convert bids from dicts to SwapBid objects
        doc_dict["bids"] = [SwapBid.from_dict(bid) for bid in doc_dict.get("bids", [])]

        # Convert audit_data from dicts to SwapAuditData objects
        doc_dict["audit_data"] = [
            SwapAuditData.from_dict(audit) for audit in doc_dict.get("audit_data", [])
        ]

        return SwapRequest(**doc_dict)

    @classmethod
    def from_core(cls, swap_request: SwapRequest) -> "SwapRequestSchema":
        return cls(
            id=swap_request.id,
            team=swap_request.team_id,
            created_by_user=swap_request.created_by_user_id,
            swap_type=swap_request.swap_type.value,
            status=swap_request.status.value,
            offered_assignment_ids=swap_request.offered_assignment_ids,
            requested_assignment_ids=swap_request.requested_assignment_ids,
            target_worker=swap_request.target_worker_id,
            offering_worker=swap_request.offering_worker_id or None,
            comment=swap_request.comment,
            bids=[bid.to_dict() for bid in swap_request.bids],
            created_at=swap_request.created_at.timestamp(),
            completed_at=(
                swap_request.completed_at.timestamp()
                if swap_request.completed_at
                else None
            ),
            completed_by_user=swap_request.completed_by_user_id,
            reverted_at=(
                swap_request.reverted_at.timestamp()
                if swap_request.reverted_at
                else None
            ),
            reverted_by_user=swap_request.reverted_by_user_id,
            audit_data=[audit.to_dict() for audit in swap_request.audit_data],
        )
