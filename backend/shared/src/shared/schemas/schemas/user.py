from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Literal

SUPPORTED_LANGUAGES_LITERAL = Literal["en", "es", "fr"]


class Language(Enum):
    EN = "en"
    ES = "es"
    FR = "fr"


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    workers: List[str]
    language: Language
    sign_up_at: datetime
    impersonating_user_id: str | None


@dataclass
class PasswordData:
    current_password: str
    new_password: str
    new_password_confirm: str


@dataclass
class UserAuth:
    id: str
    email: str


@dataclass
class UserDashboard:
    user: User | None
    user_authn: UserAuth | None
    user_authz: UserAuth | None
