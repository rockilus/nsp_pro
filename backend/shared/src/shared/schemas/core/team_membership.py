from dataclasses import dataclass
from enum import Enum
from typing import List


class TeamMembershipRole(Enum):
    OWNER = "owner"
    MEMBER = "member"


@dataclass
class TeamMembership:
    id: str
    user_id: str
    team_id: str
    roles: List[TeamMembershipRole]
