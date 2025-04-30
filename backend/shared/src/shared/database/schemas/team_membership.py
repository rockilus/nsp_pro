from typing import List

from shared.database.schemas.base import DocumentBaseSchema
from shared.schemas.core.team_membership import (
    TeamMembership,
    TeamMembershipRole,
)


class TeamMembershipSchema(DocumentBaseSchema):
    """Team Membership schema for validation."""

    user_id: str
    team_id: str
    roles: List[str]

    def to_core(self) -> TeamMembership:
        return TeamMembership(
            id=self.id or "",
            user_id=self.user_id,
            team_id=self.team_id,
            roles=[TeamMembershipRole(role) for role in self.roles],
        )

    @classmethod
    def from_core(cls, membership: TeamMembership) -> "TeamMembershipSchema":
        return cls(
            id=membership.id,
            user_id=membership.user_id,
            team_id=membership.team_id,
            roles=[membership_role.value for membership_role in membership.roles],
        )
