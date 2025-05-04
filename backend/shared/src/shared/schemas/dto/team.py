from pydantic import BaseModel


class TeamDTO(BaseModel):
    id: str
    name: str
    createdByUserId: str
    createdAt: float


class MembershipForTeamWithMembershipDTO(BaseModel):
    role: str


class TeamWithMembershipDTO(BaseModel):
    team: TeamDTO
    membership: MembershipForTeamWithMembershipDTO
