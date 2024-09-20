from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Stats, StatsHeader, StatsOptions, StatsValue
from errors import (
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import (
    ShiftWorkerOptionMessage,
    StatsHeaderMessage,
    StatsMessage,
    StatsOptionsMessage,
    StatsValueMessage,
)
from routes.constraint_routes import (
    core_to_msg_shift_worker_option,
    msg_to_core_shift_worker_option,
)
from scripts.setup_database import stats_header_db
from services.stats_services import build_stats
from services.stats_services import get_shift_options as get_shift_options_service

router = APIRouter()


@router.post("/stats/stats-headers/teams/{team_id}", status_code=201)
async def create_stats_header(
    team_id: str,
    req: StatsHeaderMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsHeaderMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-stats-header", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a stats header",
            )
        sh_data = msg_to_core_stats_header(req)
        stats_header = stats_header_db.create_stats_header(sh_data)
        # stats = build_stats(team_id)
        response = core_to_msg_stats_header(stats_header)
    except Exception as e:
        log_info("Failed to create stats header")
        handle_routes_errors(e)
    return response


@router.get("/stats/shift-options/teams/{team_id}")
async def get_shift_options(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftWorkerOptionMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        shift_options = get_shift_options_service(team_id)
        response = [core_to_msg_shift_worker_option(so) for so in shift_options]
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.post("/stats/teams/{team_id}")
async def calculate_stats(
    team_id: str,
    options: StatsOptionsMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> StatsMessage:
    try:
        if not await authz_check(session.get_user_id(), "read-stats", "team", team_id):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        stats_options = msg_to_core_stats_options(options)
        stats = build_stats(team_id, stats_options)
        response = core_to_msg_stats(stats)
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.delete("/stats/stats-headers/{stats_header_id}/teams/{team_id}")
async def delete_stats_header(
    stats_header_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-stats-header", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete stats header",
            )
        stats_header_db.delete_stats_header(stats_header_id)
    except Exception as e:
        log_info("Failed to delete stats header")
        handle_routes_errors(e)
    return {"message": "StatsHeader deleted"}


# Mappers
# core to message
def core_to_msg_stats_value(stats_value: StatsValue) -> StatsValueMessage:
    data = asdict(stats_value)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatsValueMessage)
    return validator.validate_python(as_dict)


def core_to_msg_stats_header(stats_header: StatsHeader) -> StatsHeaderMessage:
    data = asdict(stats_header)
    data["selected_shifts"] = [
        core_to_msg_shift_worker_option(v) for v in stats_header.selected_shifts
    ]
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


# message to core
def msg_to_core_stats_options(
    msg: StatsOptionsMessage,
) -> StatsOptions:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["selected_shifts"] = [
        msg_to_core_shift_worker_option(v) for v in msg.selectedShifts
    ]
    try:
        out = StatsOptions(**data_snake)
    except Exception as e:
        log_info("Failed to convert StatsOptionsMessage to StatsOptions")
        handle_create_core_object_error(e)
    return out


def msg_to_core_stats_header(msg: StatsHeaderMessage) -> StatsHeader:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["selected_shifts"] = [
        msg_to_core_shift_worker_option(v) for v in msg.selectedShifts
    ]
    try:
        stats_header = StatsHeader(**data_snake)
    except Exception as e:
        log_info("Failed to convert StatsHeaderMessage to StatsHeader")
        handle_create_core_object_error(e)
    return stats_header
