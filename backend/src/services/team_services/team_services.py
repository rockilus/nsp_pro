from typing import List

from core.team import Team
from scripts.setup_database import team_db
from services.authorization.authz_services import (
    permit_role_assignment_get_user_teams,
    permit_team_resource_instance_create,
)


async def create_team(team: Team) -> Team:
    new_team = team_db.create_team(team)
    await permit_team_resource_instance_create(new_team)
    return new_team


async def get_user_teams(user_id: str) -> List[Team]:
    return await permit_role_assignment_get_user_teams(user_id, "leader")
