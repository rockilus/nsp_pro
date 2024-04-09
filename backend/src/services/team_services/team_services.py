import time
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
    start_time_get_user_teams = time.time()
    team_ids = await authz_role_assignment_get_user_team_ids(user_id, "leader")
    end_time_get_user_teams = time.time()
    start_time_get_teams_from_db = time.time()
    teams = team_db.get_teams_by_ids(team_ids)
    end_time_get_teams_from_db = time.time()
    total_time_get_user_teams = (
        end_time_get_user_teams - start_time_get_user_teams
    )
    total_time_get_teams_from_db = (
        end_time_get_teams_from_db - start_time_get_teams_from_db
    )
    print(f"Total time to get user teams:    {total_time_get_user_teams}")
    print(f"Total time to get teams from db: {total_time_get_teams_from_db}")
    return teams
