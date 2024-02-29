from dataclasses import asdict
from typing import Dict, List, Union

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.schedule import Stat, StatsOptions
from routes.api_model import StatMessage, StatsMessage, StatsOptionsMessage
from scripts.setup_database import stats_options_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check
from services.stats_services.stats_setup import stats_setup

router = APIRouter()


@router.post("/stats-options/teams/{team_id}", status_code=201)
async def create_stats_options(
    team_id: str,
    req: StatsOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsMessage:
    if not await permit_check(
        session.get_user_id(), "create-stats-options", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a stats options",
        )
    s_data = api_msg_to_stats_options(req)
    stats_options = stats_options_db.create_stats_options(s_data)
    stats = stats_setup(team_id)
    return stats_to_api_msg(stats_options, stats)


@router.get("/stats-options/teams/{team_id}")
async def get_stats_options(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsMessage:
    if not await permit_check(
        session.get_user_id(), "read-stats-options", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get stats options",
        )
    stats_options = stats_options_db.get_stats_options(team_id)
    stats = stats_setup(team_id)
    return stats_to_api_msg(stats_options, stats)


@router.put("/stats-options/{stats_options_id}/teams/{team_id}")
async def update_stats_options(
    stats_options_id: str,
    team_id: str,
    stats_options_api: StatsOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsMessage:
    if not await permit_check(
        session.get_user_id(), "update-stats-options", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update stats options",
        )
    existing_stats_options = stats_options_db.get_stats_options_by_id(stats_options_id)
    if not existing_stats_options:
        raise HTTPException(status_code=404, detail="Stats options does not exist")
    stats_options_data = api_msg_to_stats_options(stats_options_api)
    updated_stats_options = stats_options_db.update_stats_options(stats_options_data)
    stats = stats_setup(team_id)
    return stats_to_api_msg(updated_stats_options, stats)


@router.delete("/stats-options/{stats_options_id}/teams/{team_id}")
async def delete_stats_options(
    stats_options_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await permit_check(
        session.get_user_id(), "delete-stats-options", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete stats options",
        )
    stats_options_db.delete_stats_options(stats_options_id)
    return {"message": "CoverageSelector deleted"}


def stat_to_api_msg(stat: Stat) -> StatMessage:
    data = asdict(stat)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatMessage)
    return validator.validate_python(as_dict)


def stats_options_to_api_msg(
    stats_options: Union[StatsOptions, None],
) -> Union[StatsOptionsMessage, None]:
    if stats_options is None:
        return None
    data = asdict(stats_options)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsOptionsMessage)
    return validator.validate_python(as_dict)


def stats_to_api_msg(
    stats_options: Union[StatsOptions, None],
    stats: List[Stat],
) -> StatsMessage:
    data: Dict[
        str,
        Union[
            StatsOptionsMessage,
            List[StatMessage],
            None,
        ],
    ] = {}
    data["stats_options"] = stats_options_to_api_msg(stats_options)
    data["stats"] = [stat_to_api_msg(s) for s in stats]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsMessage)
    return validator.validate_python(as_dict)


def api_msg_to_stats_options(msg: StatsOptionsMessage) -> StatsOptions:
    data_snake = humps.decamelize(msg.model_dump())
    return StatsOptions(**data_snake)
