from typing import List, Literal, Optional

from pydantic import BaseModel

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


class AssignmentCreateCellDTO(BaseModel):
    """A single (row, date) cell selected by the user for bulk creation.

    ``row_id`` is a shift ID when ``group_by="shift"`` or a worker ID when
    ``group_by="worker"``.  The target entity (the other axis) is supplied
    separately as ``entity_id`` on the parent DTO.
    """

    row_id: str
    date: float  # UNIX timestamp (UTC midnight)
    schedule_id: Optional[str] = None


class BulkAssignmentCreateDTO(BaseModel):
    """Minimal payload for bulk assignment creation.

    The backend constructs the full Assignment objects, enforcing
    ``source=MANUAL`` and ``fixed=False`` — these fields are never
    accepted from the client.
    """

    cells: List[AssignmentCreateCellDTO]
    entity_id: str  # worker_id (shift view) or shift_id (worker view)
    group_by: Literal["shift", "worker"]


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
