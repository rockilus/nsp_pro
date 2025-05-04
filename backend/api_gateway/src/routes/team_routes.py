import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from shared.logger import log_info
from shared.schemas.core import Team, UserWithMembership
from shared.schemas.dto import (
    TeamDTO,
    TeamWithMembershipDTO,
    UserWithMembershipDTO,
)

from src.dependencies import get_team_service
from src.errors import NotAuthorizedError  # MessageTypeError,
from src.errors import handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.team_service import TeamService

router = APIRouter()


@router.post("/teams")
async def create_team(
    team_name: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> TeamDTO:
    try:
        if not team_name.strip():
            raise HTTPException(
                status_code=400, detail="Team name cannot be empty"
            )

        owner_id = session.get_user_id()
        new_team = await team_service.create_team(
            team_name=team_name, owner_id=owner_id
        )
        response = new_team.to_dto()
    except Exception as e:
        log_info("Failed to create team")
        handle_routes_errors(e)
    return response


@router.get("/teams")
async def get_teams(
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> List[TeamDTO]:
    start_time = time.time()
    try:
        start_time_get_teams = time.time()
        teams = await team_service.get_user_teams(session.get_user_id())
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


@router.get("/teams/{team_id}")
async def get_team(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> TeamDTO:
    try:
        if not authz_check(
            session.get_user_id(), "update-team", "team", team_id
        ):
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


@router.get("/teams/with-memberships")
async def get_user_teams_with_memberships(
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> List[TeamWithMembershipDTO]:
    try:
        user_id = session.get_user_id()
        teams_with_memberships = team_service.get_user_teams_with_memberships(
            user_id=user_id
        )
        response = [t.to_dto() for t in teams_with_memberships]
    except Exception as e:
        log_info("Failed to get user teams with memberships")
        handle_routes_errors(e)
    return response


@router.get("/teams/{team_id}/users")
async def get_team_users_with_memberships(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> List[UserWithMembershipDTO]:
    try:
        if not authz_check(
            session.get_user_id(), "view-team-users", "team", team_id
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
def update_team(
    team_id: str,
    team: TeamDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
) -> TeamDTO:
    try:
        if not authz_check(
            session.get_user_id(), "update-team", "team", team_id
        ):
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
    session: SessionContainerType = Depends(authn_verify_session()),
    team_service: TeamService = Depends(get_team_service),
):
    try:
        user_id = session.get_user_id()
        await team_service.leave_team(user_id=user_id, team_id=team_id)
        return {"message": "Successfully left the team"}
    except Exception as e:
        log_info("Failed to leave team")
        handle_routes_errors(e)


# @router.delete("/teams/{team_id}")
# def delete_team(team_id: str) -> Dict:
#     delete_team_service(team_id)
#     return {"message": "Team deleted"}
