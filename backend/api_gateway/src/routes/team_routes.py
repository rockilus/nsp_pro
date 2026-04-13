import time
import inspect
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from shared.logger import log_info
from shared.schemas.core import Team
from shared.schemas.dto import (
    TeamDTO,
    TeamWithMembershipDTO,
    UserWithMembershipDTO,
)

from src.dependencies import get_team_service, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import NotAuthorizedError  # MessageTypeError,
from src.errors import handle_routes_errors
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.audit import log_impersonated_action
from src.security.user_context import UserContext
from src.services.team_service import TeamService

router = APIRouter()


class TeamCreateRequest(BaseModel):
    team_name: str


# pylint: disable=R0801
@router.post("/teams")
async def create_team(
    req: TeamCreateRequest,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> TeamWithMembershipDTO:
    try:
        if not await authz.check(
            user_context.user_id,
            action="create-team",
            resource_kind="user",
            resource_id=user_context.user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a team"
            )

        if not req.team_name.strip():
            raise HTTPException(
                status_code=400, detail="Team name cannot be empty"
            )

        log_impersonated_action(user_context, "create_team")
        new_team = await team_service.create_team(
            team_name=req.team_name, owner_id=user_context.effective_user_id
        )
        response = new_team.to_dto()
    except Exception as e:
        log_info("Failed to create team")
        handle_routes_errors(e)
    return response


@router.get("/teams")
async def get_teams(
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[TeamDTO]:
    start_time = time.time()
    try:
        if not await authz.check(
            user_context.user_id,
            action="read-teams",
            resource_kind="user",
            resource_id=user_context.user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to read teams"
            )
        start_time_get_teams = time.time()
        teams = team_service.get_user_teams(
            user_id=user_context.effective_user_id
        )
        if inspect.isawaitable(teams):
            teams = await teams
        end_time_get_teams = time.time()
        start_time_convert = time.time()
        response = [t.to_dto() for t in teams]
        end_time_convert = time.time()
    except Exception as e:
        log_info("Failed to get teams")
        handle_routes_errors(e)
    end_time = time.time()
    total_time = end_time - start_time
    total_time_get_teams = end_time_get_teams - start_time_get_teams
    total_time_convert = end_time_convert - start_time_convert
    print(f"Total time teams:            {total_time}")
    print(f"Total time to get teams:     {total_time_get_teams}")
    print(f"Total time to convert teams: {total_time_convert}")
    return response


@router.get("/teams/with-memberships")
async def get_user_teams_with_memberships(
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[TeamWithMembershipDTO]:
    try:
        if not await authz.check(
            user_context.user_id,
            action="read-teams",
            resource_kind="user",
            resource_id=user_context.user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to read teams"
            )
        teams_with_memberships = team_service.get_user_teams_with_memberships(
            user_id=user_context.effective_user_id
        )
        if inspect.isawaitable(teams_with_memberships):
            teams_with_memberships = await teams_with_memberships
        response = [t.to_dto() for t in teams_with_memberships]
    except Exception as e:
        log_info("Failed to get user teams with memberships")
        handle_routes_errors(e)
    return response


@router.get("/teams/{team_id}")
async def get_team(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> TeamDTO:
    try:
        if not await authz.check(
            user_context.user_id, "read-team", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read a team"
            )
        team = team_service.get_team_by_id(team_id=team_id)
        if inspect.isawaitable(team):
            team = await team
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        response = team.to_dto()
    except Exception as e:
        log_info("Failed to get team")
        handle_routes_errors(e)
    return response


@router.get("/teams/{team_id}/users")
async def get_team_users_with_memberships(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[UserWithMembershipDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-team-users", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to view team users"
            )
        users_with_memberships = team_service.get_team_users_with_memberships(
            team_id=team_id
        )
        if inspect.isawaitable(users_with_memberships):
            users_with_memberships = await users_with_memberships
        response = [user.to_dto() for user in users_with_memberships]
    except Exception as e:
        log_info("Failed to get team users")
        handle_routes_errors(e)
    return response


@router.put("/teams/{team_id}")
async def update_team(
    team_id: str,
    team: TeamDTO,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> TeamDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-team", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a team"
            )
        team_data = Team.from_dto(team)
        updated_team = team_service.update_team(team_data)
        if inspect.isawaitable(updated_team):
            updated_team = await updated_team
        response = updated_team.to_dto()
    except Exception as e:
        log_info("Failed to update team")
        handle_routes_errors(e)
    return response


@router.delete("/teams/{team_id}/leave")
async def leave_team(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id,
            action="leave-team",
            resource_kind="user",
            resource_id=user_context.user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to leave the team"
            )
        log_impersonated_action(user_context, "leave_team")
        await team_service.remove_user_from_team(
            user_id=user_context.effective_user_id,
            team_id=team_id,
            is_self_leave=True,
        )
        return {"message": "Successfully left the team"}
    except Exception as e:
        log_info("Failed to leave team")
        handle_routes_errors(e)


@router.delete("/teams/{team_id}/users/{user_id}")
async def remove_user_from_team(
    team_id: str,
    user_id: str,
    user_context: UserContext = Depends(get_user_context),
    team_service: TeamService = Depends(get_team_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_context.user_id, "remove-user", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to remove a user from the team"
            )
        await team_service.remove_user_from_team(
            user_id=user_id, team_id=team_id
        )
        return {"message": "User successfully removed from the team"}
    except Exception as e:
        log_info("Failed to remove user from team")
        handle_routes_errors(e)


# @router.delete("/teams/{team_id}")
# def delete_team(team_id: str) -> Dict:
#     delete_team_service(team_id)
#     return {"message": "Team deleted"}
