from datetime import datetime, time, timezone

from pydantic import field_validator

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.request import Request, RequestStatus


class RequestSchema(DocumentBaseSchema):
    """Request schema for validation."""

    team: str  # Store team ID instead of reference
    worker: str  # Store worker ID instead of reference
    start_date: float
    end_date: float
    shift: str  # Store shift ID instead of reference
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
            id=self.id or "",
            team_id=self.team,
            worker_id=self.worker,
            start_date=datetime.fromtimestamp(self.start_date, tz=timezone.utc).date(),
            end_date=datetime.fromtimestamp(self.end_date, tz=timezone.utc).date(),
            shift_id=self.shift,
            negative=self.negative,
            hard=self.hard,
            status=RequestStatus(self.status),
        )

    @classmethod
    def from_core(cls, request: Request) -> "RequestSchema":
        return cls(
            id=request.id,
            team=request.team_id,
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
        )
