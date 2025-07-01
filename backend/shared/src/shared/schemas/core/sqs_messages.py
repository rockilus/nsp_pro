"""SQS message schemas for NSP Pro solve service."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class SolveStatus(str, Enum):
    """Status of solve requests."""

    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class SqsSolveRequest(BaseModel):
    schedule_id: str
    team_id: str


# pylint: disable=too-few-public-methods
class SQSSolveMessage(BaseModel):
    """Message schema for SQS solve requests."""

    schedule_id: str = Field(..., description="Schedule ID to solve")
    team_id: str = Field(..., description="Team ID for authorization")
    user_id: str = Field(..., description="User ID who initiated the request")
    timeout_seconds: int = Field(
        default=300, description="Timeout for solve operation in seconds"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When the request was created",
    )
    message_id: Optional[str] = Field(default=None, description="SQS message ID")

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}

    def to_dict(self) -> dict:
        """
        Return a dict representation of the message, suitable for SQS serialization.
        Uses Pydantic's model_dump() with by_alias and proper datetime encoding.
        Ensures created_at is a float timestamp (seconds since epoch, UTC).
        """
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "created_at" in data and isinstance(data["created_at"], datetime):
            data["created_at"] = data["created_at"].timestamp()
        return data


class SQSSolveResponse(BaseModel):
    """Response schema for completed solve requests."""

    message_id: str = Field(..., description="Original SQS message ID")
    schedule_id: str = Field(..., description="Schedule ID that was solved")
    status: SolveStatus = Field(..., description="Final status of the solve")
    result: Optional[Dict[str, Any]] = Field(
        default=None, description="Solve result data"
    )
    error: Optional[str] = Field(
        default=None, description="Error message if solve failed"
    )
    processing_time_seconds: Optional[float] = Field(
        default=None, description="Time taken to process the solve"
    )
    completed_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the solve was completed",
    )
    metrics: Optional[Dict[str, Any]] = Field(
        default=None, description="Performance and quality metrics"
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SQSHealthCheck(BaseModel):
    """Health check response for SQS."""

    status: str = Field(..., description="Health status")
    queue_messages: Optional[int] = Field(
        default=None, description="Number of messages in queue"
    )
    queue_messages_not_visible: Optional[int] = Field(
        default=None, description="Number of messages being processed"
    )
    queue_messages_delayed: Optional[int] = Field(
        default=None, description="Number of delayed messages"
    )
    error: Optional[str] = Field(default=None, description="Error message if unhealthy")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the health check was performed",
    )

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}
