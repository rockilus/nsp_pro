from typing import List, Optional

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


class BulkAssignmentCreateDTO(BaseModel):
    assignments: List[AssignmentDTO]


class BulkAssignmentUpdateDTO(BaseModel):
    assignments: List[AssignmentDTO]
    intent: Optional[SelectionIntentDTO] = None


class BulkAssignmentDeleteDTO(BaseModel):
    ids: List[str]
    intent: Optional[SelectionIntentDTO] = None
