"""SQS message schemas for NSP Pro solve service."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class SolveRequestPriority(str, Enum):
    """Priority levels for solve requests."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class SolveRequestType(str, Enum):
    """Types of solve requests."""

    FULL_SOLVE = "full_solve"
    PARTIAL_SOLVE = "partial_solve"
    VALIDATION = "validation"


class SolveStatus(str, Enum):
    """Status of solve requests."""

    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class SQSSolveMessage(BaseModel):
    """Message schema for SQS solve requests."""

    schedule_id: str = Field(..., description="Schedule ID to solve")
    team_id: str = Field(..., description="Team ID for authorization")
    user_id: str = Field(..., description="User ID who initiated the request")
    request_type: SolveRequestType = Field(
        default=SolveRequestType.FULL_SOLVE,
        description="Type of solve request",
    )
    priority: SolveRequestPriority = Field(
        default=SolveRequestPriority.NORMAL,
        description="Priority of the request",
    )
    constraints: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional constraints for solving"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None, description="Additional metadata"
    )
    timeout_seconds: int = Field(
        default=300, description="Timeout for solve operation in seconds"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the request was created",
    )
    message_id: Optional[str] = Field(
        default=None, description="SQS message ID"
    )

    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}


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
    error: Optional[str] = Field(
        default=None, description="Error message if unhealthy"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the health check was performed",
    )

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}
