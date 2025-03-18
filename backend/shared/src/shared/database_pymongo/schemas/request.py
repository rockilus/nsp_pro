from datetime import datetime, time, timezone

from bson import ObjectId
from pydantic import field_validator

from shared.database_pymongo.schemas.base import DocumentBaseSchema
from shared.schemas.schemas.request import Request, RequestStatus


class RequestSchema(DocumentBaseSchema):
    """Request schema for validation."""

    team: ObjectId
    worker: ObjectId
    shift: ObjectId
    start_date: float
    end_date: float
    negative: bool
    hard: bool
    status: int

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: int) -> int:
        """Validate status is a valid enum value."""
        if v not in [e.value for e in RequestStatus]:
            raise ValueError(f"Invalid status: {v}")
        return v

    def to_core(self) -> Request:
        return Request(
            id=str(self.id) or "",
            team_id=str(self.team),
            worker_id=str(self.worker),
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(self.end_date, tz=timezone.utc).date(),
            shift_id=str(self.shift),
            negative=self.negative,
            hard=self.hard,
            status=RequestStatus(self.status),
        )

    @classmethod
    def from_core(cls, request: Request) -> "RequestSchema":
        return cls(
            id=(
                ObjectId(request.id)
                if request.id and ObjectId.is_valid(request.id)
                else None
            ),
            team=ObjectId(request.team_id),
            worker=ObjectId(request.worker_id),
            start_date=datetime.combine(
                request.start_date, time.min, timezone.utc
            ).timestamp(),
            end_date=datetime.combine(
                request.end_date, time.min, timezone.utc
            ).timestamp(),
            shift=ObjectId(request.shift_id),
            negative=request.negative,
            hard=request.hard,
            status=request.status.value,
        )
