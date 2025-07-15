import time
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

from src.dependencies import get_team_service
from src.dependencies.auth_dependencies import get_user_context
from src.errors import NotAuthorizedError  # MessageTypeError,
from src.errors import handle_routes_errors
from src.integrations.authorization import authz_check
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
) -> TeamWithMembershipDTO:
    try:
        user_id = user_context.user_id
        if not await authz_check(
            user_context,
            action="create-team",
            resource="user",
            resource_id=user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a team"
            )

        if not req.team_name.strip():
            raise HTTPException(
                status_code=400, detail="Team name cannot be empty"
            )

        new_team = await team_service.create_team(
            team_name=req.team_name, owner_id=user_id
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
) -> List[TeamDTO]:
    start_time = time.time()
    try:
        user_id = user_context.user_id
        if not await authz_check(
            user_context,
            action="read-teams",
            resource="user",
            resource_id=user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to read teams"
            )
        start_time_get_teams = time.time()
        teams = await team_service.get_user_teams(user_id=user_id)
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
) -> List[TeamWithMembershipDTO]:
    try:
        user_id = user_context.user_id
        if not await authz_check(
            user_context,
            action="read-teams",
            resource="user",
            resource_id=user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to read teams"
            )
        teams_with_memberships = team_service.get_user_teams_with_memberships(
            user_id=user_id
        )
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
) -> TeamDTO:
    try:
        if not await authz_check(user_context, "read-teams", "team", team_id):
            raise NotAuthorizedError(
                "You do not have permission to update a team"
            )
        team = team_service.get_team_by_id(team_id=team_id)
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
) -> List[UserWithMembershipDTO]:
    try:
        if not await authz_check(
            user_context, "read-team-users", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to view team users"
            )
        users_with_memberships = team_service.get_team_users_with_memberships(
            team_id=team_id
        )
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
) -> TeamDTO:
    try:
        if not await authz_check(user_context, "update-team", "team", team_id):
            raise NotAuthorizedError(
                "You do not have permission to update a team"
            )
        team_data = Team.from_dto(team)
        updated_team = team_service.update_team(team_data)
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
):
    try:
        user_id = user_context.user_id
        if not await authz_check(
            user_context,
            action="leave-team",
            resource="user",
            resource_id=user_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to leave the team"
            )
        await team_service.remove_user_from_team(
            user_id=user_id, team_id=team_id
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
):
    try:
        if not await authz_check(user_context, "remove-user", "team", team_id):
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
