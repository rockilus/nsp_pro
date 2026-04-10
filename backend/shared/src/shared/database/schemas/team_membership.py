from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)


class TeamMembershipSchema(DocumentBaseSchema):
    """Team Membership schema for validation."""

    user_id: str
    team_id: str
    role: str

    def to_core(self) -> TeamMembership:
        return TeamMembership(
            id=self.id or "",
            user_id=self.user_id,
            team_id=self.team_id,
            role=TeamMembershipRole(self.role),
        )

    @classmethod
    def from_core(cls, membership: TeamMembership) -> "TeamMembershipSchema":
        return cls(
            id=membership.id,
            user_id=membership.user_id,
            team_id=membership.team_id,
            role=membership.role.value,
        )
