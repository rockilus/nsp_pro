import time
from typing import List

from shared.schemas.core import Team, TeamMembership, TeamMembershipRole

from src.integrations.authorization import (
    authz_role_assignment_get_user_team_ids,
    authz_team_resource_instance_create,
)
from src.services.base_service import BaseService
from src.services.shift_service import ShiftService
from src.services.team_membership_service import TeamMembershipService


class TeamService(BaseService):
    def __init__(
        self,
        collection,
        shift_service: ShiftService,
        team_membership_service: TeamMembershipService,
    ):
        super().__init__(collection)
        self.shift_service = shift_service
        self.team_membership_service = team_membership_service

    async def create_team(self, team: Team, owner_id: str) -> Team:
        new_team = self.collection.team_db.create_team(team)
        await authz_team_resource_instance_create(new_team)
        membership = TeamMembership(
            id="",
            user_id=owner_id,
            team_id=new_team.id,
            roles=[TeamMembershipRole.OWNER],
        )
        await self.team_membership_service.create_team_membership(membership)
        self.shift_service.create_default_shifts(new_team.id)
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
