from pydantic import BaseModel


class TeamInvitationDTO(BaseModel):
    id: str
    teamId: str
    email: str
    workerId: str
    token: str
    status: str
    createdAt: float
    expiresAt: float
