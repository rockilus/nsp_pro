from dataclasses import dataclass
from typing import List


@dataclass
class User:
    id: str
    username: str
    hashed_password: str
    first_name: str
    last_name: str
    roles: List[str]


@dataclass
class UserSignUp:
    username: str
    password: str
    first_name: str
    last_name: str


@dataclass
class Role:
    id: str
    name: str
    description: str
    permissions: list[str]


@dataclass
class Permission:
    id: str
    name: str
    description: str
