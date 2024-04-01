from typing import List

from core.team import Team
from integrations.authorization import (
    authz_role_assignment_get_user_team_ids,
    authz_team_resource_instance_create,
)
from scripts.setup_database import team_db


async def create_team(team: Team) -> Team:
    new_team = team_db.create_team(team)
    await authz_team_resource_instance_create(new_team)
    return new_team


async def get_user_teams(user_id: str) -> List[Team]:
    team_ids = await authz_role_assignment_get_user_team_ids(user_id, "leader")
    teams = [team_db.get_team_by_id(team_id) for team_id in team_ids]
    return teams
