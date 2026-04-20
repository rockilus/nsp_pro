"""SQS message schemas for NSP Pro solve service."""

import json
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Literal, Optional

import humps
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

from shared.schemas.core.assignment import Assignment
from shared.schemas.core.breach import Breach
from shared.schemas.core.request import Request, RequestAugmented
from shared.schemas.dto.solve_task_status import (
    ResultModelDTO,
    SolveTaskStatusResponseDTO,
)


class SolveStatus(str, Enum):
    """Status of solve requests."""

    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    TIMEOUT = "TIMEOUT"


class SolveScopeType(str, Enum):
    """Scope type for partial campaign solve."""

    FULL = "FULL"
    DUTIES = "DUTIES"
    NON_DUTIES = "NON_DUTIES"
    CUSTOM = "CUSTOM"


class WorkerDateCell(BaseModel):
    """A single (worker, date) cell for custom solve scope."""

    worker_id: str
    date: str  # ISO "YYYY-MM-DD"


class ShiftDateCell(BaseModel):
    """A single (shift, date) cell for custom solve scope."""

    shift_id: str
    date: str  # ISO "YYYY-MM-DD"


class SolveScope(BaseModel):
    """Scope definition for partial campaign solve requests."""

    scope_type: SolveScopeType
    worker_ids: Optional[List[str]] = None
    shift_ids: Optional[List[str]] = None
    dates: Optional[List[str]] = None
    worker_cells: Optional[List[WorkerDateCell]] = None
    shift_cells: Optional[List[ShiftDateCell]] = None
    solve_view: Optional[Literal["worker", "shift"]] = None


class SolveRequest(BaseModel):
    schedule_id: str
    team_id: str
    solve_scope: Optional[SolveScope] = None


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
    solve_scope: Optional[SolveScope] = Field(
        default=None, description="Scope for partial campaign solve"
    )

    model_config = ConfigDict(use_enum_values=True)

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

    @classmethod
    def from_dict(cls, data: dict) -> "SQSSolveMessage":
        """
        Create an instance from a dict representation.
        Converts created_at from float timestamp back to datetime.
        """
        if "created_at" in data and isinstance(data["created_at"], (int, float)):
            data["created_at"] = datetime.fromtimestamp(
                data["created_at"], tz=timezone.utc
            )
        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> "SQSSolveMessage":
        """
        Create an instance from a JSON string representation.
        Converts created_at from float timestamp back to datetime if needed.
        """
        data = json.loads(json_str)
        return cls.from_dict(data)


class SQSSolveQueueMessage(BaseModel):
    """
    Wrapper for a solve request message received from SQS, including metadata.
    """

    message: SQSSolveMessage
    receipt_handle: str
    message_id: str


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

    model_config = ConfigDict(use_enum_values=True)


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


class SolveRequestStatus(str, Enum):
    """
    Status object for SQS solve requests, suitable for database storage.
    """

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Status object for SQS solve requests, suitable for database storage.


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
                [r.to_dto() for r in requests_augmented] if requests_augmented else []
            ),
        )


class SolverOutputStatus(str, Enum):
    UNKNOWN = "UNKNOWN"
    MODEL_INVALID = "MODEL_INVALID"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    OPTIMAL = "OPTIMAL"

    @classmethod
    def from_int(cls, value: int) -> "SolverOutputStatus":
        """
        Map an integer value to the corresponding SolverOutputStatus enum.
        0: UNKNOWN
        1: MODEL_INVALID
        2: FEASIBLE
        3: INFEASIBLE
        4: OPTIMAL
        Raises ValueError for invalid values.
        """
        mapping = {
            0: cls.UNKNOWN,
            1: cls.MODEL_INVALID,
            2: cls.FEASIBLE,
            3: cls.INFEASIBLE,
            4: cls.OPTIMAL,
        }
        if value not in mapping:
            raise ValueError(f"Invalid solver output status int: {value}")
        return mapping[value]


class SolverOutputMetadata(BaseModel):
    status: SolverOutputStatus
    objective_value: Optional[float] = None
    wall_time: Optional[float] = None
    output_time: Optional[datetime] = None


class SolveTaskStatus(BaseModel):
    """
    Status object for SQS solve requests, suitable for database storage.
    """

    solve_id: str
    schedule_id: str
    team_id: str
    user_id: str
    request_status: SolveRequestStatus
    solve_status: ScheduleSolveStatus
    started_at: datetime
    ttl_seconds: int = 180  # Default TTL of 3 minutes
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result: Optional[ResultModel] = None
    solver_output_metadata: Optional[SolverOutputMetadata] = None
    id: Optional[str]

    model_config = ConfigDict(use_enum_values=True)

    def to_response_dto(
        self, requests_augmented: Optional[List[RequestAugmented]] = None
    ) -> SolveTaskStatusResponseDTO:
        """
        Convert this SolveTaskStatus to a SolveTaskStatusResponseDTO for API responses.
        """
        data = self.model_dump()
        data["started_at"] = self.started_at.timestamp() if self.started_at else None
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

    def is_expired(self) -> bool:
        """
        Check if the solve task has expired based on started_at and ttl_seconds.
        Returns True if expired, False otherwise. Uses UTC times.
        """
        now_utc = datetime.now(timezone.utc)
        expiry_time = self.started_at + timedelta(seconds=self.ttl_seconds)
        return now_utc > expiry_time
