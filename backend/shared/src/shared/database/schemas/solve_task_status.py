"""
MongoDB schema for persisting SolveTaskStatus (SQS solve workflow).
Includes conversion to/from core Pydantic models in shared.schemas.core.sqs_messages.
"""

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel

from shared.database.schemas.assignment import AssignmentSchema
from shared.database.schemas.base import DocumentBaseSchema
from shared.database.schemas.breach import BreachSchema
from shared.database.schemas.request import RequestSchema

# Correct imports from core and db schemas
from shared.schemas.core.solve_task_status import (
    ResultModel,
    ScheduleSolveStatus,
    SolveRequestStatus,
    SolverOutputMetadata,
    SolverOutputStatus,
    SolveTaskStatus,
)

# Import core models and enums


class ResultModelSchema(BaseModel):
    """
    Schema for the result of a solve task, containing assignments, breaches,
    and requests. Mirrors core ResultModel.
    """

    assignments: List[AssignmentSchema]
    breaches: List[BreachSchema]
    requests: List[RequestSchema]

    def to_core(self) -> ResultModel:
        return ResultModel(
            assignments=[a.to_core() for a in self.assignments],
            breaches=[b.to_core() for b in self.breaches],
            requests=[r.to_core() for r in self.requests],
        )

    @classmethod
    def from_core(cls, core: ResultModel) -> "ResultModelSchema":
        """
        Convert from core ResultModel (Pydantic) to MongoDB schema.
        """
        return cls(
            assignments=[AssignmentSchema.from_core(a) for a in core.assignments],
            breaches=[BreachSchema.from_core(b) for b in core.breaches],
            requests=[RequestSchema.from_core(r) for r in core.requests],
        )


class SolverOutputMetadataSchema(BaseModel):
    """
    Schema for solver output metadata, including status, objective value, wall
    time, and output time. Mirrors core SolverOutputMetadata.
    """

    status: str
    objective_value: Optional[float] = None
    wall_time: Optional[float] = None
    output_time: Optional[float] = None  # UTC timestamp

    def to_core(self) -> SolverOutputMetadata:

        return SolverOutputMetadata(
            status=SolverOutputStatus(self.status),
            objective_value=self.objective_value,
            wall_time=self.wall_time,
            output_time=(
                datetime.fromtimestamp(self.output_time, tz=timezone.utc)
                if self.output_time is not None
                else None
            ),
        )

    @classmethod
    def from_core(cls, core: SolverOutputMetadata) -> "SolverOutputMetadataSchema":
        """
        Convert from core SolverOutputMetadata (Pydantic) to MongoDB schema.
        """
        return cls(
            status=core.status.value,
            objective_value=core.objective_value,
            wall_time=core.wall_time,
            output_time=(
                core.output_time.timestamp() if core.output_time is not None else None
            ),
        )


# pylint: disable=too-few-public-methods
class SolveTaskStatusSchema(DocumentBaseSchema):
    """
    MongoDB schema for persisting the status and result of a solve task.
    Mirrors core SolveTaskStatus, with nested result and metadata fields.
    """

    solve_id: str
    schedule_id: str
    team_id: str
    user_id: str
    request_status: str
    solve_status: str
    started_at: float  # UTC timestamp
    ttl_seconds: int = 180  # Default TTL of 3 minutes
    completed_at: Optional[float] = None  # UTC timestamp
    error_message: Optional[str] = None
    result: Optional[ResultModelSchema] = None
    solver_output_status: Optional[SolverOutputMetadataSchema] = None

    @classmethod
    def from_core(cls, core: SolveTaskStatus) -> "SolveTaskStatusSchema":
        """
        Convert from core SolveTaskStatus (Pydantic) to MongoDB schema.
        """

        result = core.result
        return cls(
            solve_id=core.solve_id,
            schedule_id=core.schedule_id,
            team_id=core.team_id,
            user_id=core.user_id,
            request_status=(
                core.request_status.value
                if hasattr(core.request_status, "value")
                else str(core.request_status)
            ),
            solve_status=(
                core.solve_status.value
                if hasattr(core.solve_status, "value")
                else str(core.solve_status)
            ),
            started_at=core.started_at.timestamp(),
            ttl_seconds=core.ttl_seconds,
            completed_at=(
                core.completed_at.timestamp() if core.completed_at is not None else None
            ),
            error_message=core.error_message,
            result=ResultModelSchema.from_core(result) if result else None,
            solver_output_status=(
                SolverOutputMetadataSchema.from_core(core.solver_output_metadata)
                if core.solver_output_metadata
                else None
            ),
            id=str(core.id) if core.id else None,
        )

    def to_core(self) -> SolveTaskStatus:
        """
        Convert from MongoDB schema to core SolveTaskStatus (Pydantic).
        """

        return SolveTaskStatus(
            id=self.id or None,
            solve_id=self.solve_id,
            schedule_id=self.schedule_id,
            team_id=self.team_id,
            user_id=self.user_id,
            request_status=SolveRequestStatus(self.request_status),
            solve_status=ScheduleSolveStatus(self.solve_status),
            started_at=(datetime.fromtimestamp(self.started_at, tz=timezone.utc)),
            ttl_seconds=self.ttl_seconds,
            completed_at=(
                datetime.fromtimestamp(self.completed_at, tz=timezone.utc)
                if self.completed_at is not None
                else None
            ),
            error_message=self.error_message,
            result=self.result.to_core() if self.result else None,
            solver_output_metadata=(
                self.solver_output_status.to_core()
                if self.solver_output_status
                else None
            ),
        )
