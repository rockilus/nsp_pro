from dataclasses import dataclass
from typing import List


@dataclass
class Specialty:
    id: str
    team_id: str
    name: str
    deleted: bool


@dataclass
class Team:
    id: str
    team_members: List[str]
    team_leaders: List[str]
