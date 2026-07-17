from typing import Optional

from pydantic import BaseModel


class SlotPeriodDTO(BaseModel):
    startHour: int = 6
    startMinute: int = 0
    endHour: int = 12
    endMinute: int = 0


class SlotPeriodsDTO(BaseModel):
    morning: SlotPeriodDTO
    afternoon: SlotPeriodDTO
    night: SlotPeriodDTO


class TeamDTO(BaseModel):
    id: str
    name: str
    createdByUserId: str
    createdAt: float
    useSolver: bool
    showStats: bool = False
    slotPeriods: Optional[SlotPeriodsDTO] = None


class MembershipForTeamWithMembershipDTO(BaseModel):
    role: str


class TeamWithMembershipDTO(BaseModel):
    team: TeamDTO
    membership: MembershipForTeamWithMembershipDTO


class AdminTeamRowDTO(BaseModel):
    """Single row for the admin team-search table."""

    team_id: str
    team_name: str
    owner_ids: list[str]
    owner_names: list[str]
    owner_emails: list[str]


class PaginatedTeamsResponse(BaseModel):
    """Server-side paginated response for admin team listing."""

    items: list[AdminTeamRowDTO]
    total: int
    page: int
    page_size: int
