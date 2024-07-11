from dataclasses import dataclass
from typing import List

from utils.constants import SUPPORTED_LANGUAGES_LITERAL


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    workers: List[str]
    language: SUPPORTED_LANGUAGES_LITERAL


@dataclass
class PasswordData:
    current_password: str
    new_password: str
    new_password_confirm: str
