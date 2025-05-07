import time
from datetime import datetime, timezone
from typing import List

from shared.schemas.core import (
    MembershipForTeamWithMembership,
    Team,
    TeamMembership,
    TeamMembershipRole,
    TeamWithMembership,
    UserWithMembership,
)

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

    async def create_team(self, team_name: str, owner_id: str) -> Team:
        new_team = Team(
            id="",
            name=team_name,
            created_by_user_id=owner_id,
            created_at=datetime.now(timezone.utc),
        )
        new_team = self.collection.team_db.create_team(new_team)
        await authz_team_resource_instance_create(new_team)
        membership = TeamMembership(
            id="",
            user_id=owner_id,
            team_id=new_team.id,
            role=TeamMembershipRole.OWNER,
        )
        await self.team_membership_service.create_team_membership(membership)
        self.shift_service.create_default_shifts(new_team.id)
        return new_team

    def get_team_by_id(self, team_id: str) -> Team | None:
        return self.collection.team_db.get_team_by_id(team_id=team_id)

    def get_user_teams_with_memberships(self, user_id: str) -> List[TeamWithMembership]:
        memberships = (
            self.collection.team_membership_db.get_team_memberships_by_user_id(
                user_id=user_id
            )
        )
        team_ids = list(set(membership.team_id for membership in memberships))
        teams = self.collection.team_db.get_teams_by_ids(team_ids=team_ids)

        out: List[TeamWithMembership] = []
        for team in teams:
            membership = next(
                (
                    membership
                    for membership in memberships
                    if membership.team_id == team.id
                ),
                None,
            )
            if membership is not None:
                out.append(
                    TeamWithMembership(
                        team=team,
                        membership=MembershipForTeamWithMembership(
                            role=membership.role,
                        ),
                    )
                )
        return out

    def get_team_users_with_memberships(self, team_id: str) -> List[UserWithMembership]:
        memberships = (
            self.collection.team_membership_db.get_team_memberships_by_team_id(
                team_id=team_id
            )
        )
        user_ids = list(set(membership.user_id for membership in memberships))
        users = self.collection.user_db.get_users_by_ids(user_ids=user_ids)

        out: List[UserWithMembership] = []
        for user in users:
            membership = next(
                (
                    membership
                    for membership in memberships
                    if membership.user_id == user.id
                ),
                None,
            )
            if membership is not None:
                out.append(
                    UserWithMembership(
                        user=user,
                        membership=MembershipForTeamWithMembership(
                            role=membership.role,
                        ),
                    )
                )
        return out

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

    def update_team(self, team: Team) -> Team:
        existing_team = self.collection.team_db.get_team_by_id(team_id=team.id)
        if existing_team is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Team not found")
        if (
            existing_team.created_by_user_id != team.created_by_user_id
            or existing_team.created_at != team.created_at
        ):
            # pylint: disable=broad-exception-raised
            raise Exception("Cannot update team")
        updated_team = self.collection.team_db.update_team(team)
        return updated_team

    async def remove_user_from_team(self, user_id: str, team_id: str) -> None:
        membership = (
            self.collection.team_membership_db.get_team_membership_by_user_and_team_id(
                user_id=user_id, team_id=team_id
            )
        )
        if membership is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Membership not found")
        if membership.role == TeamMembershipRole.OWNER:
            # pylint: disable=broad-exception-raised
            raise Exception("Cannot leave team as owner")
        await self.team_membership_service.delete_team_membership(membership.id)
        worker = self.collection.worker_db.get_workers_by_team_and_user(
            team_id=team_id, user_id=user_id
        )
        if worker:
            for w in worker:
                w.user_id = None
            self.collection.worker_db.update_workers(worker)
