import time
from typing import List

from shared.schemas import Team

from src.integrations.authorization import (
    authz_role_assignment_get_user_team_ids,
    authz_team_resource_instance_create,
)
from src.services.base_service import BaseService
from src.services.shift_service import ShiftService


class TeamService(BaseService):
    def __init__(self, collection, shift_service: ShiftService):
        super().__init__(collection)
        self.shift_service = shift_service

    async def create_team(self, team: Team) -> Team:
        new_team = self.collection.team_db.create_team(team)
        self.shift_service.create_default_shifts(new_team.id)
        await authz_team_resource_instance_create(new_team)
        return new_team

    async def get_user_teams(self, user_id: str) -> List[Team]:
        start_time_get_user_teams = time.time()
        team_ids = await authz_role_assignment_get_user_team_ids(user_id, "leader")
        end_time_get_user_teams = time.time()
        start_time_get_teams_from_db = time.time()
        teams = self.collection.team_db.get_teams_by_ids(team_ids)
        end_time_get_teams_from_db = time.time()
        total_time_get_user_teams = end_time_get_user_teams - start_time_get_user_teams
        total_time_get_teams_from_db = (
            end_time_get_teams_from_db - start_time_get_teams_from_db
        )
        print(f"Total time to get user teams:    {total_time_get_user_teams}")
        print(f"Total time to get teams from db: {total_time_get_teams_from_db}")
        return teams
