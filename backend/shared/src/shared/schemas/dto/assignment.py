from typing import List

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


class BulkAssignmentCreateDTO(BaseModel):
    assignments: List[AssignmentDTO]


class BulkAssignmentUpdateDTO(BaseModel):
    assignments: List[AssignmentDTO]


class BulkAssignmentDeleteDTO(BaseModel):
    ids: List[str]
