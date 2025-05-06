from pydantic import BaseModel


class TeamInvitationDTO(BaseModel):
    id: str
    teamId: str
    firstName: str | None
    lastName: str | None
    email: str
    type: str
    workerId: str | None
    token: str
    status: str
    createdBy: str | None
    createdAt: float
    expiresAt: float
    lastSentAt: float | None
