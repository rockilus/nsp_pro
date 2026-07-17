from datetime import datetime, timezone
from typing import Dict, List

from shared.schemas.core import (
    MembershipForTeamWithMembership,
    Team,
    TeamGenerationSettings,
    TeamMembership,
    TeamMembershipRole,
    TeamWithMembership,
    UserWithMembership,
)
from shared.schemas.dto import (
    AdminTeamRowDTO,
    PaginatedTeamsResponse,
    TeamGenerationSettingsDTO,
)

from src.services.base_service import BaseService
from src.services.notification_builders import (
    user_left_team_event,
    user_removed_from_team_event,
)
from src.services.notification_service import NotificationService
from src.services.shift_service import ShiftService
from src.services.team_membership_service import TeamMembershipService


class TeamService(BaseService):
    def __init__(
        self,
        collection,
        shift_service: ShiftService,
        team_membership_service: TeamMembershipService,
        notification_service: NotificationService,
    ):
        super().__init__(collection)
        self.shift_service = shift_service
        self.team_membership_service = team_membership_service
        self.notification_service = notification_service

    def get_all_teams_for_admin(
        self,
        search_name: str | None = None,
        search_owner_name: str | None = None,
        search_owner_email: str | None = None,
        search_team_id: str | None = None,
        search_owner_id: str | None = None,
        page: int = 1,
        page_size: int = 30,
    ) -> PaginatedTeamsResponse:
        """Return a paginated, filterable list of all teams for the admin merge step.

        Filtering is applied BEFORE pagination on the full dataset.  Owner info
        (names, emails, IDs) is aggregated from team memberships with role=owner.
        Owner-level filters (name, email, ID) work by first identifying matching
        owner user IDs, then filtering teams by those IDs — this means a team
        with multiple owners matches whenever *any* owner satisfies the filter.
        """
        skip = (page - 1) * page_size

        # ── Build the team-level MongoDB query ──
        team_query: Dict = {}
        if search_name:
            team_query["name"] = {"$regex": search_name, "$options": "i"}
        if search_team_id:
            team_query["_id"] = {"$regex": search_team_id, "$options": "i"}

        # Owner filters require gathering candidate owner user IDs first.
        owner_candidate_ids: set[str] | None = None
        if search_owner_name or search_owner_email or search_owner_id:
            user_query: Dict = {}
            if search_owner_id:
                user_query["_id"] = {
                    "$regex": search_owner_id,
                    "$options": "i",
                }
            if search_owner_name:
                user_query["$or"] = [
                    {
                        "first_name": {
                            "$regex": search_owner_name,
                            "$options": "i",
                        }
                    },
                    {
                        "last_name": {
                            "$regex": search_owner_name,
                            "$options": "i",
                        }
                    },
                ]
            if search_owner_email:
                user_query["email"] = {
                    "$regex": search_owner_email,
                    "$options": "i",
                }

            matching_users = self.collection.user_db.find_all(user_query)
            owner_candidate_ids = {u.id for u in matching_users if u.id is not None}

            # Find memberships for those users where role is owner
            if owner_candidate_ids:
                owner_memberships = self.collection.team_membership_db.find_all(
                    {
                        "user_id": {"$in": list(owner_candidate_ids)},
                        "role": TeamMembershipRole.OWNER.value,
                    }
                )
                owner_team_ids = {m.team_id for m in owner_memberships if m.team_id}
                team_query["_id"] = {
                    "$in": list(owner_team_ids),
                    **(team_query.pop("_id") if "_id" in team_query else {}),
                }
            else:
                # No matching users → empty result
                return PaginatedTeamsResponse(
                    items=[], total=0, page=page, page_size=page_size
                )

        # ── Fetch paginated teams ──
        teams, total = self.collection.team_db.get_all_teams_paginated(
            filters=team_query, skip=skip, limit=page_size
        )

        if not teams:
            return PaginatedTeamsResponse(
                items=[], total=total, page=page, page_size=page_size
            )

        # ── Gather all owners for these teams ──
        team_ids = [t.id for t in teams]
        all_memberships = self.collection.team_membership_db.find_all(
            {
                "team_id": {"$in": team_ids},
                "role": TeamMembershipRole.OWNER.value,
            }
        )
        all_owner_user_ids = list({m.user_id for m in all_memberships})
        all_owner_users = (
            self.collection.user_db.get_users_by_ids(all_owner_user_ids)
            if all_owner_user_ids
            else []
        )
        user_by_id = {u.id: u for u in all_owner_users}

        # ── Build row DTOs ──
        rows: List[AdminTeamRowDTO] = []
        for team in teams:
            team_memberships = [m for m in all_memberships if m.team_id == team.id]
            owner_users = [
                user_by_id[m.user_id]
                for m in team_memberships
                if m.user_id in user_by_id
            ]
            rows.append(
                AdminTeamRowDTO(
                    team_id=team.id,
                    team_name=team.name,
                    owner_ids=[u.id for u in owner_users],
                    owner_names=[f"{u.first_name} {u.last_name}" for u in owner_users],
                    owner_emails=[u.email for u in owner_users],
                )
            )

        return PaginatedTeamsResponse(
            items=rows, total=total, page=page, page_size=page_size
        )

    async def create_team(self, team_name: str, owner_id: str) -> TeamWithMembership:
        new_team = Team(
            id="",
            name=team_name,
            created_by_user_id=owner_id,
            created_at=datetime.now(timezone.utc),
            use_solver=True,
            show_stats=False,
        )
        new_team = self.collection.team_db.create_team(new_team)
        membership = TeamMembership(
            id="",
            user_id=owner_id,
            team_id=new_team.id,
            role=TeamMembershipRole.OWNER,
        )
        await self.team_membership_service.create_team_membership(membership)
        self.shift_service.create_default_shifts(new_team.id)
        return TeamWithMembership(
            team=new_team,
            membership=MembershipForTeamWithMembership(
                role=membership.role,
            ),
        )

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

    def get_user_teams(self, user_id: str) -> List[Team]:
        memberships = (
            self.collection.team_membership_db.get_team_memberships_by_user_id(
                user_id=user_id
            )
        )
        owner_team_ids = [
            m.team_id for m in memberships if m.role == TeamMembershipRole.OWNER
        ]
        return self.collection.team_db.get_teams_by_ids(owner_team_ids)

    def update_team(self, team: Team) -> Team:
        existing_team = self.collection.team_db.get_team_by_id(team_id=team.id)
        if existing_team is None:
            # pylint: disable=broad-exception-raised
            raise Exception("Team not found")
        team.created_at = existing_team.created_at
        team.created_by_user_id = existing_team.created_by_user_id
        updated_team = self.collection.team_db.update_team(team)
        return updated_team

    async def remove_user_from_team(
        self, user_id: str, team_id: str, is_self_leave: bool = False
    ) -> None:
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
        team = self.collection.team_db.get_team_by_id(team_id=team_id)
        team_name = team.name if team else ""
        if is_self_leave:
            removed_user = self.collection.user_db.get_user_by_id(user_id=user_id)
            user_name = (
                f"{removed_user.first_name} {removed_user.last_name}"
                if removed_user
                else ""
            )
            memberships = (
                self.collection.team_membership_db.get_team_memberships_by_team_id(
                    team_id
                )
            )
            owner_user_ids = [
                m.user_id for m in memberships if m.role == TeamMembershipRole.OWNER
            ]
            if owner_user_ids:
                await self.notification_service.dispatch(
                    user_left_team_event(
                        team_id=team_id,
                        team_name=team_name,
                        user_name=user_name,
                        owner_user_ids=owner_user_ids,
                    )
                )
        else:
            await self.notification_service.dispatch(
                user_removed_from_team_event(
                    team_id=team_id,
                    team_name=team_name,
                    removed_user_id=user_id,
                )
            )

    def get_generation_settings(self, team_id: str) -> TeamGenerationSettings:
        """Return team generation settings, using defaults if no document exists."""
        settings = self.collection.team_generation_settings_db.get_by_team_id(team_id)
        return (
            settings
            if settings is not None
            else TeamGenerationSettings.default(team_id)
        )

    def update_generation_settings(
        self, team_id: str, dto: TeamGenerationSettingsDTO
    ) -> TeamGenerationSettings:
        """Validate team exists then upsert generation settings."""
        team = self.collection.team_db.get_team_by_id(team_id)
        if team is None:
            raise ValueError(f"Team {team_id} not found")
        settings = TeamGenerationSettings(
            team_id=team_id,
            duty_scope_work_time=dto.duty_scope_work_time,
            duty_consecutive_gap_mode=dto.duty_consecutive_gap_mode,
            duty_consecutive_gap_days=dto.duty_consecutive_gap_days,
        )
        return self.collection.team_generation_settings_db.upsert(settings)
