"""SQS message schemas for NSP Pro solve service."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import humps
from pydantic import TypeAdapter
from pydantic import BaseModel, Field
from dataclasses import asdict

from shared.schemas.core.assignment import Assignment
from shared.schemas.core.breach import Breach
from shared.schemas.core.request import Request
from shared.schemas.dto.solve_task_status import (
    SolveTaskStatusResponseDTO,
    ResultModelDTO,
)
from shared.schemas.dto.assignment import AssignmentDTO
from shared.schemas.dto.breach import BreachDTO
from shared.schemas.dto.request import RequestDTO
from shared.schemas.core.request import RequestAugmented


class SolveStatus(str, Enum):
    """Status of solve requests."""

    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class SolveRequest(BaseModel):
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
    message_id: Optional[str] = Field(
        default=None, description="SQS message ID"
    )

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


class SolveRequestStatus(str, Enum):
    """
    Status object for SQS solve requests, suitable for database storage.
    Mirrors the frontend SqsSolveStatusResponse interface.
    """

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Status object for SQS solve requests, suitable for database storage.
# Mirrors the frontend SqsSolveStatusResponse interface.


class ScheduleSolveStatus(Enum):
    NOT_SOLVED = "NOT_SOLVED"
    SOLVED_NO_BREACH = "SOLVED_NO_BREACH"
    SOLVED_HARD_BREACHED = "SOLVED_HARD_BREACHED"
    SOLVED_SOFT_BREACHED = "SOLVED_SOFT_BREACHED"
    NO_SOLUTION = "NO_SOLUTION"


class ResultModel(BaseModel):
    assignments: List[Assignment]
    breaches: List[Breach]
    requests: List[Request]

    def to_dto(
        self, requests_augmented: Optional[List[RequestAugmented]] = None
    ) -> ResultModelDTO:
        """Convert this ResultModel to a ResultModelDTO for API responses."""
        return ResultModelDTO(
            assignments=[a.to_dto() for a in self.assignments],
            breaches=[b.to_dto() for b in self.breaches],
            requests=(
                [r.to_dto() for r in requests_augmented]
                if requests_augmented
                else []
            ),
        )


class SolverOutputStatus(str, Enum):
    UNKNOWN = "UNKNOWN"
    MODEL_INVALID = "MODEL_INVALID"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    OPTIMAL = "OPTIMAL"


class SolverOutputMetadata(BaseModel):
    status: SolverOutputStatus
    objective_value: Optional[float] = None
    wall_time: Optional[float] = None
    output_time: Optional[datetime] = None


class SolveTaskStatus(BaseModel):
    """
    Status object for SQS solve requests, suitable for database storage.
    Mirrors the frontend SqsSolveStatusResponse interface.
    """

    solve_id: str
    schedule_id: str
    team_id: str
    user_id: str
    request_status: SolveRequestStatus
    solve_status: ScheduleSolveStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[ResultModel] = None
    solver_output_metadata: Optional[SolverOutputMetadata] = None
    id: Optional[str]

    class Config:
        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}

    def to_response_dto(
        self, requests_augmented: Optional[List[RequestAugmented]] = None
    ) -> SolveTaskStatusResponseDTO:
        """
        Convert this SolveTaskStatus to a SolveTaskStatusResponseDTO for API responses.
        """
        data = asdict(self)
        data["started_at"] = (
            self.started_at.timestamp() if self.started_at else None
        )
        data["completed_at"] = (
            self.completed_at.timestamp() if self.completed_at else None
        )
        data["result"] = (
            self.result.to_dto(requests_augmented=requests_augmented)
            if self.result
            else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(SolveTaskStatusResponseDTO)
        return validator.validate_python(as_dict)
