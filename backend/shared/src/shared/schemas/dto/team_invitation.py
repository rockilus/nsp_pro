from pydantic import BaseModel


class TeamInvitationDTO(BaseModel):
    id: str
    teamId: str
    email: str
    type: str
    workerId: str | None
    token: str
    status: str
    createdAt: float
    expiresAt: float
    lastSentAt: float | None
