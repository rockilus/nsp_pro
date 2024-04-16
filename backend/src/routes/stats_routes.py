from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Stat, StatsOptions, Stats, StatsHeader, StatsValue
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import (
    StatMessage,
    StatsOptionsAndStatsMessage,
    StatsOptionsMessage,
    StatsValueMessage,
    StatsHeaderMessage,
    StatsMessage,
)
from scripts.setup_database import stats_options_db
from services.stats_services import stats_setup

router = APIRouter()


@router.post("/stats/stats-options/teams/{team_id}", status_code=201)
async def create_stats_options(
    team_id: str,
    req: StatsOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsOptionsAndStatsMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a stats options",
            )
        s_data = msg_to_core_stats_options(req)
        stats_options = stats_options_db.create_stats_options(s_data)
        stats = stats_setup(team_id)
        response = core_to_msg_stats_options_and_stats(stats_options, stats)
    except Exception as e:
        log_info("Failed to create stats options")
        handle_routes_errors(e)
    return response


@router.get("/stats/stats-options/teams/{team_id}")
async def get_stats_options(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsOptionsAndStatsMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "read-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        stats_options = stats_options_db.get_stats_options(team_id)
        stats = stats_setup(team_id)
        response = core_to_msg_stats_options_and_stats(stats_options, stats)
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.post("/stats/teams/{team_id}")
async def get_stats(
    team_id: str,
    options: Dict[str, str],
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "read-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        # stats_options = stats_options_db.get_stats_options(team_id)
        stats = stats_setup(
            team_id,
            options["time_frame"],
            options["table_value"],
            options["table_column"],
        )
        response = core_to_msg_stats(stats)
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.put("/stats/stats-options/{stats_options_id}/teams/{team_id}")
async def update_stats_options(
    team_id: str,
    stats_options_api: StatsOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsOptionsAndStatsMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update stats options",
            )
        stats_options_data = msg_to_core_stats_options(stats_options_api)
        updated_stats_options = stats_options_db.update_stats_options(
            stats_options_data
        )
        stats = stats_setup(team_id)
        response = core_to_msg_stats_options_and_stats(
            updated_stats_options, stats
        )
    except Exception as e:
        log_info("Failed to update stats options")
        handle_routes_errors(e)
    return response


@router.delete("/stats/stats-options/{stats_options_id}/teams/{team_id}")
async def delete_stats_options(
    stats_options_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete stats options",
            )
        stats_options_db.delete_stats_options(stats_options_id)
    except Exception as e:
        log_info("Failed to delete stats options")
        handle_routes_errors(e)
    return {"message": "CoverageSelector deleted"}


# Mappers
# core to message
def core_to_msg_stats_value(stats_value: StatsValue) -> StatsValueMessage:
    data = asdict(stats_value)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsValueMessage)
    return validator.validate_python(as_dict)


def core_to_msg_stats_header(stats_header: StatsHeader) -> StatsHeaderMessage:
    data = asdict(stats_header)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsHeaderMessage)
    return validator.validate_python(as_dict)


def core_to_msg_stats(stats: Stats) -> StatsMessage:
    data: Dict[
        str,
        List[StatsHeaderMessage] | List[StatsValueMessage],
    ] = {}
    data["stats_headers"] = [
        core_to_msg_stats_header(sh) for sh in stats.stats_headers
    ]
    data["stats_values"] = [
        core_to_msg_stats_value(sv) for sv in stats.stats_values
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsMessage)
    return validator.validate_python(as_dict)


def core_to_msg_stat(stat: Stat) -> StatMessage:
    try:
        data = asdict(stat)
    except Exception as e:
        log_info("Failed to convert Stat to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Stat to StatMessage")
        handle_message_errors(e)
    return s_msg


def core_to_msg_stats_options(
    stats_options: StatsOptions | None,
) -> StatsOptionsMessage | None:
    if stats_options is None:
        return None
    try:
        data = asdict(stats_options)
    except Exception as e:
        log_info("Failed to convert StatsOptions to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsOptionsMessage)
    try:
        so_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert StatsOptions to StatsOptionsMessage")
        handle_message_errors(e)
    return so_msg


def core_to_msg_stats_options_and_stats(
    stats_options: StatsOptions | None, stats: List[Stat]
) -> StatsOptionsAndStatsMessage:
    data: Dict[
        str,
        StatsOptionsMessage | List[StatMessage] | None,
    ] = {}
    data["stats_options"] = core_to_msg_stats_options(stats_options)
    data["stats"] = [core_to_msg_stat(s) for s in stats]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsOptionsAndStatsMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Stats to StatsMessage")
        handle_message_errors(e)
    return s_msg


# message to core
def msg_to_core_stats_options(msg: StatsOptionsMessage) -> StatsOptions:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        stats_options = StatsOptions(**data_snake)
    except Exception as e:
        log_info("Failed to convert StatsOptionsMessage to StatsOptions")
        handle_create_core_object_error(e)
    return stats_options
