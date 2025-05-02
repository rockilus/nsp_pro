import time
from typing import List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Team
from shared.schemas.dto import TeamDTO, TeamWithMembershipDTO

from src.dependencies import get_db_collections, get_team_service
from src.errors import NotAuthorizedError  # MessageTypeError,
from src.errors import handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.team_service import TeamService

router = APIRouter()


# @router.post("/teams")
# async def create_team(
#     team: TeamMessage, session: SessionContainer = Depends(verify_session())
# ) -> TeamMessage:
#     t_data = api_msg_to_team(team)
#     new_team = await create_team_service(t_data)
#     return team_to_api_msg(new_team)


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


@router.put("/teams/{team_id}")
def update_team(
    team_id: str,
    team: TeamDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> TeamDTO:
    try:
        if not authz_check(session.get_user_id(), "update-team", "team", team_id):
            raise NotAuthorizedError("You do not have permission to update a team")
        team_data = Team.from_dto(team)
        updated_team = db_collections.team_db.update_team(team_data)
        response = updated_team.to_dto()
    except Exception as e:
        log_info("Failed to update team")
        handle_routes_errors(e)
    return response


# @router.delete("/teams/{team_id}")
# def delete_team(team_id: str) -> Dict:
#     delete_team_service(team_id)
#     return {"message": "Team deleted"}
