from dataclasses import asdict
from typing import Dict, List, Union

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.schedule import Stat, StatsOptions
from routes.api_model import StatMessage, StatsMessage, StatsOptionsMessage
from scripts.setup_database import stats_options_db
from services.stats_services.stats_setup import stats_setup

router = APIRouter()


@router.post("/stats-options", status_code=201)
def create_stats_options(req: StatsOptionsMessage) -> StatsMessage:
    s_data = api_msg_to_stats_options(req)
    stats_options = stats_options_db.create_stats_options(s_data)
    stats = stats_setup()
    return stats_to_api_msg(stats_options, stats)


@router.get("/stats-options")
def get_stats_options() -> StatsMessage:
    stats_options = stats_options_db.get_stats_options()
    stats = stats_setup()
    return stats_to_api_msg(stats_options, stats)


@router.put("/stats-options/{stats_options_id}")
def update_stats_options(
    stats_options_id: str, stats_options_api: StatsOptionsMessage
) -> StatsMessage:
    existing_stats_options = stats_options_db.get_stats_options_by_id(stats_options_id)
    if not existing_stats_options:
        raise HTTPException(status_code=404, detail="Stats options does not exist")
    stats_options_data = api_msg_to_stats_options(stats_options_api)
    updated_stats_options = stats_options_db.update_stats_options(stats_options_data)
    stats = stats_setup()
    return stats_to_api_msg(updated_stats_options, stats)


@router.delete("/stats-options/{stats_options_id}")
def delete_stats_options(stats_options_id: str) -> Dict:
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
