from datetime import datetime, time, timezone

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.request import (
    FulfillmentStatus,
    Request,
    RequestStatus,
    RequestType,
)


class RequestSchema(DocumentBaseSchema):
    """Request schema for validation."""

    team: str
    request_type: str
    worker: str
    start_date: float
    end_date: float
    shift: str
    negative: bool
    hard: bool
    status: str
    fulfillment: str
    comment: str
    created_at: float

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: int) -> int:
        """Validate status is a valid enum value."""
        if v not in [e.value for e in RequestStatus]:
            raise ValueError(f"Invalid status: {v}")
        return v

    def to_core(self) -> Request:
        return Request(
            id=self.id or "",
            team_id=self.team,
            request_type=RequestType(self.request_type),
            worker_id=self.worker,
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(self.end_date, tz=timezone.utc).date(),
            shift_id=self.shift,
            negative=self.negative,
            hard=self.hard,
            status=RequestStatus(self.status),
            fulfillment=FulfillmentStatus(self.fulfillment),
            comment=self.comment,
            created_at=datetime.fromtimestamp(self.created_at, tz=timezone.utc),
        )

    @classmethod
    def from_core(cls, request: Request) -> "RequestSchema":
        return cls(
            id=request.id,
            team=request.team_id,
            request_type=request.request_type.value,
            worker=request.worker_id,
            start_date=datetime.combine(
                request.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                request.end_date, time.min, timezone.utc
            ).timestamp(),
            shift=request.shift_id,
            negative=request.negative,
            hard=request.hard,
            status=request.status.value,
            fulfillment=request.fulfillment.value,
            comment=request.comment,
            created_at=request.created_at.timestamp(),
        )
