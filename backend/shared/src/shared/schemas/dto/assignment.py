from pydantic import BaseModel


class AssignmentDTO(BaseModel):
    id: str
    teamId: str
    scheduleId: str | None
    workerId: str
    date: float
    shiftId: str
    fixed: bool
    referenceAssignmentId: str | None
