from dataclasses import dataclass
from typing import List, Literal


@dataclass
class User:
    id: str
    email: str
    first_name: str
    last_name: str
    workers: List[str]
    language: Literal["en", "es", "fr"]


@dataclass
class PasswordData:
    current_password: str
    new_password: str
    new_password_confirm: str
