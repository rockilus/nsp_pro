from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.team_invitation import TeamInvitationDTO


class TeamInvitationStatus(Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class TeamInvitationType(Enum):
    MEMBER = "member"


@dataclass
class TeamInvitation:
    id: str
    team_id: str
    email: str
    type: TeamInvitationType
    worker_id: Optional[str]
    token: str
    status: TeamInvitationStatus
    created_at: datetime
    expires_at: datetime
    last_sent_at: Optional[datetime] = None

    def to_dto(self) -> TeamInvitationDTO:
        data = asdict(self)
        data["type"] = self.type.value
        data["status"] = self.status.value
        data["created_at"] = self.created_at.timestamp()
        data["expires_at"] = self.expires_at.timestamp()
        data["last_sent_at"] = (
            self.last_sent_at.timestamp() if self.last_sent_at else None
        )
        as_dict = humps.camelize(data)
        validator = TypeAdapter(TeamInvitationDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: TeamInvitationDTO) -> "TeamInvitation":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["type"] = TeamInvitationType(data_dict["type"])
        data_dict["status"] = TeamInvitationStatus(data_dict["status"])
        data_dict["created_at"] = datetime.fromtimestamp(
            data_dict["created_at"], tz=timezone.utc
        )
        data_dict["expires_at"] = datetime.fromtimestamp(
            data_dict["expires_at"], tz=timezone.utc
        )
        data_dict["last_sent_at"] = (
            datetime.fromtimestamp(data_dict["last_sent_at"], tz=timezone.utc)
            if data_dict["last_sent_at"]
            else None
        )
        return cls(**data_dict)
