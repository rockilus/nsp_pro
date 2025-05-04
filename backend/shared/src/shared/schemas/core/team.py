from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import humps
from pydantic import TypeAdapter

from shared.schemas.core.team_membership import TeamMembershipRole
from shared.schemas.dto.team import (
    MembershipForTeamWithMembershipDTO,
    TeamDTO,
    TeamWithMembershipDTO,
)


@dataclass
class Team:
    id: str
    name: str
    created_by_user_id: str
    created_at: datetime

    def to_dto(self) -> TeamDTO:
        data = asdict(self)
        data["created_at"] = self.created_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(TeamDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TeamDTO) -> "Team":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        return cls(**data_dict)


@dataclass
class MembershipForTeamWithMembership:
    role: TeamMembershipRole

    def to_dto(self) -> MembershipForTeamWithMembershipDTO:
        data = asdict(self)
        data["role"] = self.role.value
        as_dict = humps.camelize(data)
        validator = TypeAdapter(MembershipForTeamWithMembershipDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(
        cls, data: MembershipForTeamWithMembershipDTO
    ) -> "MembershipForTeamWithMembership":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["role"] = TeamMembershipRole(data_dict["role"])
        return cls(**data_dict)


@dataclass
class TeamWithMembership:
    team: Team
    membership: MembershipForTeamWithMembership

    def to_dto(self) -> TeamWithMembershipDTO:
        data = asdict(self)
        data["team"] = self.team.to_dto()
        data["membership"] = self.membership.to_dto()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(TeamWithMembershipDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TeamWithMembershipDTO) -> "TeamWithMembership":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["team"] = Team.from_dto(data_dict["team"])
        data_dict["membership"] = MembershipForTeamWithMembership.from_dto(
            data_dict["membership"]
        )
        return cls(**data_dict)
