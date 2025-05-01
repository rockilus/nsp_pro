from dataclasses import asdict, dataclass
from datetime import datetime, timezone

import humps
from pydantic import TypeAdapter

from shared.schemas.dto.team import TeamDTO


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
