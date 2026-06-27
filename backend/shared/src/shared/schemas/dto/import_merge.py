"""DTOs for the import merge workflow.

These DTOs represent the merge configuration (how each imported entity
maps to the target team) and the result of executing the merge.
"""

from enum import StrEnum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

# ── Actions ──────────────────────────────────────────────────────────────────


class MergeAction(StrEnum):
    """What to do with a single imported entity."""

    ADD_NEW = "add_new"  # Create a new entity in the target team
    MERGE_INTO = "merge_into"  # Update an existing entity
    SKIP = "skip"  # Exclude entirely (cascades to related data)


# ── Per-entity mappings ──────────────────────────────────────────────────────


class WorkerMergeMapping(BaseModel):
    """How one imported worker maps to the target team."""

    generatedId: str
    action: MergeAction
    targetWorkerId: Optional[str] = None


class ShiftMergeMapping(BaseModel):
    """How one imported shift maps to the target team."""

    generatedId: str
    action: MergeAction
    targetShiftId: Optional[str] = None


class RequestMergeMapping(BaseModel):
    """How one imported request maps. Worker ref resolved via worker mapping."""

    generatedId: str
    action: MergeAction
    targetRequestId: Optional[str] = None  # For idempotent re-imports
    skipReason: Optional[str] = None
    # Values: 'cascade_worker' when parent worker was skipped


# ── Assignment configuration ─────────────────────────────────────────────────


class AssignmentMergeConfig(BaseModel):
    """Controls which imported assignments are included."""

    includeAll: bool = True
    startDate: Optional[float] = None  # UNIX timestamp
    endDate: Optional[float] = None


# ── Top-level merge request ──────────────────────────────────────────────────


class MergeRequest(BaseModel):
    """Payload for POST /admin/imports/{import_id}/merge"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "teamId": "64e9b7f1e13e4a1a9c8b4567",
                "workerMappings": [
                    {
                        "generatedId": "gen-worker-1",
                        "action": "add_new",
                        "targetWorkerId": None,
                    }
                ],
                "shiftMappings": [
                    {
                        "generatedId": "gen-shift-1",
                        "action": "merge_into",
                        "targetShiftId": "shift-1",
                    }
                ],
                "requestMappings": [
                    {
                        "generatedId": "gen-req-1",
                        "action": "skip",
                        "targetRequestId": None,
                        "skipReason": "cascade_worker",
                    }
                ],
                "assignmentConfig": {
                    "includeAll": True,
                    "startDate": 1700000000.0,
                    "endDate": None,
                },
            }
        }
    )

    teamId: str = Field(examples=["64e9b7f1e13e4a1a9c8b4567"])
    workerMappings: List[WorkerMergeMapping]
    shiftMappings: List[ShiftMergeMapping]
    requestMappings: List[RequestMergeMapping]
    assignmentConfig: AssignmentMergeConfig


# ── Merge result ─────────────────────────────────────────────────────────────


class MergeResult(BaseModel):
    """Statistics about what was created/updated/skipped."""

    workersCreated: int = 0
    workersUpdated: int = 0
    workersSkipped: int = 0
    shiftsCreated: int = 0
    shiftsUpdated: int = 0
    shiftsSkipped: int = 0
    requestsCreated: int = 0
    requestsSkipped: int = 0
    requestsCascadeSkipped: int = 0
    assignmentsCreated: int = 0


# ── Merge targets (for auto-match dropdowns) ─────────────────────────────────


class MergeTargetWorker(BaseModel):
    """Lightweight existing worker for mapping dropdown."""

    id: str
    name: str
    acronym: str


class MergeTargetShift(BaseModel):
    """Lightweight existing shift for mapping dropdown."""

    id: str
    name: str
    acronym: str
    shiftType: int


class MergeTargetsResponse(BaseModel):
    """Existing team entities available as merge targets."""

    workers: List[MergeTargetWorker] = []
    shifts: List[MergeTargetShift] = []
    suggestedWorkerMappings: List[WorkerMergeMapping] = []
    suggestedShiftMappings: List[ShiftMergeMapping] = []
