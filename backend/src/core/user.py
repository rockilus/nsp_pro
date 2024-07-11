from dataclasses import dataclass
from datetime import datetime
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
    sign_up_at: datetime


@dataclass
class PasswordData:
    current_password: str
    new_password: str
    new_password_confirm: str
