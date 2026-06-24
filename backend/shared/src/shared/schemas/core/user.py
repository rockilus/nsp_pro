from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Literal

import humps
from pydantic import TypeAdapter

from shared.schemas.core.team import MembershipForTeamWithMembership
from shared.schemas.dto.user import (
    PasswordDataDTO,
    UserDTO,
    UserWithMembershipDTO,
)

SUPPORTED_LANGUAGES_LITERAL = Literal["en", "es", "fr"]


class Language(Enum):
    EN = "en"
    ES = "es"
    FR = "fr"


class SystemRole(Enum):
    SUPER_ADMIN = "super_admin"


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    language: Language
    sign_up_at: datetime
    impersonating_user_id: str | None
    system_role: SystemRole | None = None

    def to_dto(self) -> UserDTO:
        data = asdict(self)
        data["language"] = self.language.value
        data["sign_up_at"] = self.sign_up_at.timestamp()
        data["system_role"] = self.system_role.value if self.system_role else None
        as_dict = humps.camelize(data)
        validator = TypeAdapter(UserDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: UserDTO) -> "User":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["language"] = Language(data_dict["language"])
        data_dict["sign_up_at"] = datetime.fromtimestamp(
            data_dict["sign_up_at"], tz=timezone.utc
        )
        data_dict["system_role"] = (
            SystemRole(data_dict["system_role"])
            if data_dict.get("system_role")
            else None
        )
        return cls(**data_dict)


@dataclass
class PasswordData:
    current_password: str
    new_password: str
    new_password_confirm: str

    def to_dto(self) -> PasswordDataDTO:
        data = asdict(self)
        as_dict = humps.camelize(data)
        validator = TypeAdapter(PasswordDataDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: PasswordDataDTO) -> "PasswordData":
        data_dict = humps.decamelize(data.model_dump())
        return cls(**data_dict)


@dataclass
class UserWithMembership:
    user: User
    membership: MembershipForTeamWithMembership

    def to_dto(self) -> UserWithMembershipDTO:
        data = asdict(self)
        data["user"] = self.user.to_dto()
        data["membership"] = self.membership.to_dto()
        as_dict = humps.camelize(data)
        validator = TypeAdapter(UserWithMembershipDTO)
        return validator.validate_python(as_dict)

    @classmethod
    def from_dto(cls, data: UserWithMembershipDTO) -> "UserWithMembership":
        data_dict = humps.decamelize(data.model_dump())
        data_dict["user"] = User.from_dto(data_dict["user"])
        data_dict["membership"] = MembershipForTeamWithMembership.from_dto(
            data_dict["membership"]
        )
        return cls(**data_dict)
