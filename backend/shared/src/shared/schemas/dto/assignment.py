from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from shared.schemas.dto.recurrence import RecurrenceRuleDTO


class AssignmentDTO(BaseModel):
    id: str
    teamId: str
    scheduleId: str | None
    workerId: str
    date: float
    shiftId: str
    fixed: bool
    source: str
    referenceAssignmentId: str | None
    sourceId: str | None


class AssignmentsRecurrencesResultDTO(BaseModel):
    assignmentsCreated: List[AssignmentDTO]
    assignmentsRead: List[AssignmentDTO]
    assignmentsUpdated: List[AssignmentDTO]
    assignmentsDeletedIds: List[str]
    recurrenceCreated: RecurrenceRuleDTO | None
    recurrencesRead: List[RecurrenceRuleDTO]
    recurrenceUpdated: RecurrenceRuleDTO | None
    recurrencesDeletedIds: List[str]


class ExcludedCellDTO(BaseModel):
    """A single (row, date) cell explicitly deselected by the user.

    Used in bulk-create intent to skip cells that have no assignment yet
    and therefore cannot be represented by an excluded_assignment_id.
    """

    row_id: str
    date: float  # UNIX timestamp (UTC midnight)


class SelectionIntentDTO(BaseModel):
    """Implicit campaign-scope selection criteria resolved server-side.

    Exactly one of selected_row_worker_ids / selected_row_shift_ids is
    populated, depending on the frontend groupBy setting.  An empty list
    means "all rows in the campaign".
    """

    campaign_id: str
    selected_row_worker_ids: List[str] = []  # empty = all workers in campaign
    selected_row_shift_ids: List[str] = []  # empty = all shifts in campaign
    excluded_assignment_ids: List[str] = []
    # Cells without assignments deselected by the user; consumed by bulk-create only
    excluded_cells: List[ExcludedCellDTO] = []


class AssignmentCreateCellDTO(BaseModel):
    """A single (row, date) cell selected by the user for bulk creation.

    ``row_id`` is a shift ID when ``group_by="shift"`` or a worker ID when
    ``group_by="worker"``.  The target entity (the other axis) is supplied
    separately as ``entity_id`` on the parent DTO.
    """

    row_id: str
    date: float  # UNIX timestamp (UTC midnight)


class BulkAssignmentCreateDTO(BaseModel):
    """Minimal payload for bulk assignment creation.

    The backend constructs the full Assignment objects, enforcing
    ``source=MANUAL`` and ``fixed=False`` — these fields are never
    accepted from the client.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "cells": [{"row_id": "worker-1", "date": 1700000000.0}],
                "entity_id": "shift-1",
                "group_by": "shift",
            }
        }
    )

    cells: List[AssignmentCreateCellDTO]
    entity_id: str
    group_by: Literal["shift", "worker"] = Field(examples=["shift"])
    intent: Optional[SelectionIntentDTO] = None


class BulkAssignmentUpdateDTO(BaseModel):
    """Minimal payload for bulk assignment update.

    The backend fetches the existing assignments by ID and applies the
    single-axis change (worker or shift) derived from ``entity_id`` /
    ``group_by`` — no full assignment objects are accepted from the client.
    """

    assignment_ids: List[str]
    entity_id: str  # new worker_id (shift view) or new shift_id (worker view)
    group_by: Literal["shift", "worker"]
    intent: Optional[SelectionIntentDTO] = None


class BulkAssignmentDeleteDTO(BaseModel):
    ids: List[str]
    intent: Optional[SelectionIntentDTO] = None


class BulkAssignmentToggleFixedDTO(BaseModel):
    """Minimal payload for bulk toggle-fixed operations.

    The backend fetches existing assignments by ID and flips their
    ``fixed`` boolean.  No assignment objects are accepted from the client.
    """

    assignment_ids: List[str]
    intent: Optional[SelectionIntentDTO] = None
