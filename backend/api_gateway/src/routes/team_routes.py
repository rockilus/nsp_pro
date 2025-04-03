import time
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import Team
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_team_service
from src.errors import NotAuthorizedError  # MessageTypeError,
from src.errors import handle_message_errors, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import TeamMessage
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
) -> List[TeamMessage]:
    start_time = time.time()
    try:
        start_time_get_teams = time.time()
        teams = await team_service.get_user_teams(session.get_user_id())
        end_time_get_teams = time.time()
        start_time_convert = time.time()
        response = [core_to_msg_team(t) for t in teams]
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


@router.get("/teams/selected-team-id")
async def get_selected_team_id(
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict[str, str]:
    try:
        user_id = session.get_user_id()
        teams = db_collections.team_db.get_teams_by_leader_id(user_id)
        team_id = teams[0].id
        response = {"selectedTeamId": team_id}
    except Exception as e:
        log_info("Failed to get selected team id")
        handle_routes_errors(e)
    return response


@router.put("/teams/{team_id}")
def update_team(
    team_id: str,
    team: TeamMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> TeamMessage:
    try:
        if not authz_check(session.get_user_id(), "update-team", "team", team_id):
            raise NotAuthorizedError("You do not have permission to update a team")
        team_data = msg_to_core_team(team)
        updated_team = db_collections.team_db.update_team(team_data)
        response = core_to_msg_team(updated_team)
    except Exception as e:
        log_info("Failed to update team")
        handle_routes_errors(e)
    return response


# @router.delete("/teams/{team_id}")
# def delete_team(team_id: str) -> Dict:
#     delete_team_service(team_id)
#     return {"message": "Team deleted"}


# Mappers
# core to message
def core_to_msg_team(team: Team) -> TeamMessage:
    # data = asdict(team)
    data = {"id": team.id}
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TeamMessage)
    try:
        t_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Team to TeamMessage")
        handle_message_errors(e)
    return t_msg


# message to core
def msg_to_core_team(msg: TeamMessage) -> Team:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        team = Team(**data_snake)
    except Exception as e:
        log_info("Failed to convert TeamMessage to Team")
        handle_create_schema_object_error(e)
    return team
