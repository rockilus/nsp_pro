from dataclasses import dataclass
from typing import List


@dataclass
class Team:
    id: str
    team_members: List[str]
    team_leaders: List[str]
