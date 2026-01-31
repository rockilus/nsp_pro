from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.swap import SwapBidDTO, SwapRequestDTO


class SwapType(Enum):
    DIRECT = "direct"  # Direct swap between two workers
    OPEN = "open"  # Open swap where any worker can bid


class SwapStatus(Enum):
    ACTIVE = "active"  # Swap is available for bids or waiting for acceptance
    PENDING_APPROVAL = "pending_approval"  # Workers agreed, waiting for leader approval
    COMPLETED = "completed"  # Approved and assignments swapped
    CANCELLED = "cancelled"  # Cancelled by creator or leader


@dataclass
class SwapBid:
    """Represents a bid on an open swap request."""

    id: str
    worker_id: str
    offered_assignment_ids: List[str]
    created_at: datetime
    accepted: bool = False

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["created_at"] = self.created_at.timestamp()
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "SwapBid":
        return cls(
            id=data["id"],
            worker_id=data["worker_id"],
            offered_assignment_ids=data["offered_assignment_ids"],
            created_at=datetime.fromtimestamp(data["created_at"], tz=timezone.utc),
            accepted=data.get("accepted", False),
        )

    def to_dto(self) -> SwapBidDTO:
        data = asdict(self)
        data["created_at"] = self.created_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SwapBidDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: SwapBidDTO) -> "SwapBid":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        return cls(**data_dict)


@dataclass
class SwapAuditData:
    """Stores the original assignment details before swap for audit purposes."""

    assignment_id: str
    worker_id: str
    shift_id: str
    date_iso: str

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> "SwapAuditData":
        return cls(
            assignment_id=data["assignment_id"],
            worker_id=data["worker_id"],
            shift_id=data["shift_id"],
            date_iso=data["date_iso"],
        )


# pylint: disable=too-many-instance-attributes
@dataclass
class SwapRequest:
    """Represents a request to swap assignments between workers."""

    id: str
    team_id: str
    schedule_id: str | None  # Can be None for cross-schedule swaps in the future
    swap_type: SwapType
    status: SwapStatus
    offered_assignment_ids: List[str]  # Assignments offered by the creator
    requested_assignment_ids: (
        List[str] | None
    )  # Assignments requested (None for open swaps)
    target_worker_id: str | None  # Target worker for direct swaps (None for open swaps)
    comment: str
    bids: List[SwapBid] = field(default_factory=list)  # Bids for open swaps
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    completed_by_user_id: str | None = None
    audit_data: List[SwapAuditData] = field(
        default_factory=list
    )  # Original assignment details

    def __post_init__(self):
        """Validate the swap request data based on swap type."""
        if self.swap_type == SwapType.DIRECT:
            if not self.target_worker_id:
                raise ValueError("Direct swaps must specify a target_worker_id")
            if not self.requested_assignment_ids:
                raise ValueError("Direct swaps must specify requested_assignment_ids")
        elif self.swap_type == SwapType.OPEN:
            if self.target_worker_id is not None:
                raise ValueError("Open swaps should not have a target_worker_id")
            if self.requested_assignment_ids is not None:
                raise ValueError("Open swaps should not have requested_assignment_ids")

    def to_dict(self) -> Dict:
        out = asdict(self)
        out["swap_type"] = self.swap_type.value
        out["status"] = self.status.value
        out["created_at"] = self.created_at.timestamp()
        out["completed_at"] = (
            self.completed_at.timestamp() if self.completed_at else None
        )
        out["bids"] = [bid.to_dict() for bid in self.bids]
        out["audit_data"] = [audit.to_dict() for audit in self.audit_data]
        return out

    @classmethod
    def from_dict(cls, data: Dict) -> "SwapRequest":
        return cls(
            id=data["id"],
            team_id=data["team_id"],
            schedule_id=data.get("schedule_id"),
            swap_type=SwapType(data["swap_type"]),
            status=SwapStatus(data["status"]),
            offered_assignment_ids=data["offered_assignment_ids"],
            requested_assignment_ids=data.get("requested_assignment_ids"),
            target_worker_id=data.get("target_worker_id"),
            comment=data.get("comment", ""),
            bids=[SwapBid.from_dict(b) for b in data.get("bids", [])],
            created_at=datetime.fromtimestamp(data["created_at"], tz=timezone.utc),
            completed_at=(
                datetime.fromtimestamp(data["completed_at"], tz=timezone.utc)
                if data.get("completed_at")
                else None
            ),
            completed_by_user_id=data.get("completed_by_user_id"),
            audit_data=[SwapAuditData.from_dict(a) for a in data.get("audit_data", [])],
        )

    def to_dto(self) -> SwapRequestDTO:
        data = asdict(self)
        data["swap_type"] = self.swap_type.value
        data["status"] = self.status.value
        data["created_at"] = self.created_at.timestamp()
        data["completed_at"] = (
            self.completed_at.timestamp() if self.completed_at else None
        )
        data["bids"] = [bid.to_dto().model_dump() for bid in self.bids]
        # audit_data is kept as list of dicts
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SwapRequestDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: SwapRequestDTO) -> "SwapRequest":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["swap_type"] = SwapType(data_dict["swap_type"])
        data_dict["status"] = SwapStatus(data_dict["status"])
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        data_dict["completed_at"] = (
            datetime.fromtimestamp(data_dict["completed_at"], tz=timezone.utc)
            if data_dict.get("completed_at")
            else None
        )
        data_dict["bids"] = [
            SwapBid.from_dto(SwapBidDTO(**b)) for b in data_dict.get("bids", [])
        ]
        data_dict["audit_data"] = [
            SwapAuditData.from_dict(a) for a in data_dict.get("audit_data", [])
        ]
        return cls(**data_dict)
