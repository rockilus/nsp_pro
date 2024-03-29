from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core.team import Team
from integrations.authentication import SessionContainerType, authn_verify_session
from routes.api_model import TeamMessage
from services.team_services import get_user_teams

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
) -> List[TeamMessage]:
    teams = await get_user_teams(session.get_user_id())
    return [team_to_api_msg(t) for t in teams]


# @router.put("/teams/{team_id}")
# def update_team(team_id: str, team: TeamMessage) -> TeamMessage:
#     existing_team = team_db.get_team_by_id(team_id)
#     if not existing_team:
#         raise HTTPException(status_code=404, detail="Team does not exist")
#     team_data = api_msg_to_team(team)
#     updated_team = team_db.update_team(team_data)
#     team_properties = team_property_db.get_team_properties_by_team_id(
#         updated_team.id
#     )
#     return team_to_api_msg(updated_team, team_properties)


# @router.delete("/teams/{team_id}")
# def delete_team(team_id: str) -> Dict:
#     delete_team_service(team_id)
#     return {"message": "Team deleted"}


def team_to_api_msg(team: Team) -> TeamMessage:
    # data = asdict(team)
    data = {"id": team.id}
    as_dict = humps.camelize(data)
    validator = TypeAdapter(TeamMessage)
    return validator.validate_python(as_dict)


def api_msg_to_team(msg: TeamMessage) -> Team:
    data_snake = humps.decamelize(msg.model_dump())
    return Team(**data_snake)
