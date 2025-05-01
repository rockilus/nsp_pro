from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.team_invitation import TeamInvitationDTO


class TeamInvitationStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


@dataclass
class TeamInvitation:
    id: str
    team_id: str
    email: str
    worker_id: str
    token: str
    status: TeamInvitationStatus
    created_at: datetime
    expires_at: datetime

    def to_dto(self) -> TeamInvitationDTO:
        data = asdict(self)
        data["status"] = self.status.value
        data["created_at"] = self.created_at.timestamp()
        data["expires_at"] = self.expires_at.timestamp()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(TeamInvitationDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TeamInvitationDTO) -> "TeamInvitation":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["status"] = TeamInvitationStatus(data_dict["status"])
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        data_dict["expires_at"] = datetime.fromtimestamp(
            data_dict["expires_at"], tz=timezone.utc
        )
        return cls(**data_dict)
