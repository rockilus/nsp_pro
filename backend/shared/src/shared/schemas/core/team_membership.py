from dataclasses import dataclass
from enum import Enum

INVITE_TYPE_ROLE_MAP = {
    # "admin": {
    #     "role": "admin",
    #     "link_worker": False,
    # },
    "member": {
        "role": "member",
        "link_worker": True,
    },
    # "viewer": {
    #     "role": "viewer",
    #     "link_worker": False,
    # }
}

TEAM_ROLE_TO_AUTHZ_ROLE = {
    "owner": "leader",
    # "admin": "team_admin",
    "member": "team_member",
    # "viewer": "team_viewer",
}


class TeamMembershipRole(Enum):
    OWNER = "owner"
    MEMBER = "member"


@dataclass
class TeamMembership:
    id: str
    user_id: str
    team_id: str
    role: TeamMembershipRole
