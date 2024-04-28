from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from constraint_parser import build_shift_options
from core import (
    DictBlockValue,
    GetStatsOptions,
    ShiftProperty,
    Stats,
    StatsHeader,
    StatsOptions,
    StatsValue,
)
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import (
    GetStatsOptionsMessage,
    StatsHeaderMessage,
    StatsMessage,
    StatsOptionsAndStatsMessage,
    StatsOptionsMessage,
    StatsValueMessage,
)
from scripts.setup_database import (
    shift_db,
    shift_dimension_db,
    shift_property_db,
    stats_options_db,
)
from services.stats_services import build_stats

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
        # stats = build_stats(team_id)
        stats = Stats([], [])
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
        # stats = build_stats(team_id)
        stats = Stats([], [])
        response = core_to_msg_stats_options_and_stats(stats_options, stats)
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.get("/stats/shift-options/teams/{team_id}")
async def get_shift_options(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "read-stats-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        shifts = shift_db.get_shifts(team_id)
        shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
        # pylint: disable=R0801
        shift_properties = shift_property_db.get_shift_properties_by_shift_ids(
            [s.id for s in shifts]
        )
        shift_properties_sd: Dict[str, List[ShiftProperty]] = {}
        for sp in shift_properties:
            sd_id = sp.shift_dimension_id
            if sd_id not in shift_properties_sd:
                shift_properties_sd[sd_id] = []
            shift_properties_sd[sd_id].append(sp)
        shift_options = build_shift_options(
            shifts, shift_dimensions, shift_properties_sd
        )
        response = shift_options
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.post("/stats/teams/{team_id}")
async def calculate_stats(
    team_id: str,
    options: GetStatsOptionsMessage,
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
        data = msg_to_core_get_stats_options(options)
        stats = build_stats(
            team_id,
            data.time_frame,
            data.stats_unit,
            data.table_column,
            data.selected_shifts,
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
        # stats = build_stats(team_id)
        stats = Stats([], [])
        response = core_to_msg_stats_options_and_stats(updated_stats_options, stats)
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
    data["stats_headers"] = [core_to_msg_stats_header(sh) for sh in stats.stats_headers]
    data["stats_values"] = [core_to_msg_stats_value(sv) for sv in stats.stats_values]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsMessage)
    return validator.validate_python(as_dict)


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
    stats_options: StatsOptions | None, stats: Stats
) -> StatsOptionsAndStatsMessage:
    data: Dict[
        str,
        StatsOptionsMessage | StatsMessage | None,
    ] = {}
    data["stats_options"] = core_to_msg_stats_options(stats_options)
    data["stats"] = core_to_msg_stats(stats)
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


def msg_to_core_get_stats_options(
    msg: GetStatsOptionsMessage,
) -> GetStatsOptions:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["selected_shifts"] = [
        DictBlockValue(**ss) for ss in data_snake["selected_shifts"]
    ]
    try:
        out = GetStatsOptions(**data_snake)
    except Exception as e:
        log_info("Failed to convert GetStatsOptionsMessage to GetStatsOptions")
        handle_create_core_object_error(e)
    return out
