import time as time_module
from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import DailyShiftDemand, DSDSourceType
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_daily_shift_demand_service, get_db_collections
from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import DailyShiftDemandMessage
from src.services import DailyShiftDemandService

router = APIRouter()


# pylint: disable=R0801
@router.post("/daily-shift-demands/teams/{team_id}", status_code=201)
async def create_daily_shift_demand(
    team_id: str,
    daily_shift_demand: DailyShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DailyShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an daily_shift_demand",
            )
        dsd_data = msg_to_core_daily_shift_demand(daily_shift_demand)
        dsd_created = db_collections.daily_shift_demand_db.create_daily_shift_demand(
            dsd_data
        )
        response = core_to_msg_daily_shift_demand(dsd_created)
    except Exception as e:
        log_info("Failed to create daily_shift_demand")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.get("/daily-shift-demands/teams/{team_id}")
async def get_daily_shift_demands(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    daily_shift_demand_service: DailyShiftDemandService = Depends(
        get_daily_shift_demand_service
    ),
) -> List[DailyShiftDemandMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get daily_shift_demands",
            )
        start_time = time_module.time()
        dsds = daily_shift_demand_service.get_daily_shift_demands(team_id)
        response = [core_to_msg_daily_shift_demand(dsd) for dsd in dsds]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get dsds: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get daily_shift_demands")
        handle_routes_errors(e)
    return response


@router.put("/daily-shift-demands/{daily_shift_demand_id}/teams/{team_id}")
async def update_daily_shift_demand(
    team_id: str,
    daily_shift_demand: DailyShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DailyShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an daily_shift_demand",
            )
        dsd_data = msg_to_core_daily_shift_demand(daily_shift_demand)
        updated_dsd = db_collections.daily_shift_demand_db.update_daily_shift_demand(
            dsd_data
        )
        response = core_to_msg_daily_shift_demand(updated_dsd)
    except Exception as e:
        log_info("Failed to update daily_shift_demand")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.delete("/daily-shift-demands/{daily_shift_demand_id}/teams/{team_id}")
async def delete_daily_shift_demand(
    daily_shift_demand_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an daily_shift_demand",
            )
        db_collections.daily_shift_demand_db.delete_daily_shift_demand(
            daily_shift_demand_id
        )
    except Exception as e:
        log_info("Failed to delete daily_shift_demand")
        handle_routes_errors(e)
    return {"message": "DailyShiftDemand deleted"}


# Mappers
# core to message
def core_to_msg_daily_shift_demand(
    daily_shift_demand: DailyShiftDemand,
) -> DailyShiftDemandMessage:
    try:
        data = asdict(daily_shift_demand)
    except Exception as e:
        log_info("Failed to convert DailyShiftDemand to dictionary")
        raise MessageTypeError(str(e)) from e
    data["date"] = datetime.combine(
        daily_shift_demand.date, time.min, tzinfo=timezone.utc
    ).timestamp()
    as_dict = humps.camelize(data)
    validator = TypeAdapter(DailyShiftDemandMessage)
    try:
        a_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert DailyShiftDemand to DailyShiftDemandMessage")
        handle_message_errors(e)
    return a_msg


# message to core
def msg_to_core_daily_shift_demand(
    msg: DailyShiftDemandMessage,
) -> DailyShiftDemand:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["source_type"] = DSDSourceType(data_snake["source_type"])
    data_snake["date"] = datetime.fromtimestamp(data_snake["date"], timezone.utc).date()
    try:
        daily_shift_demand = DailyShiftDemand(**data_snake)
    except Exception as e:
        log_info("Failed to convert DailyShiftDemandMessage to DailyShiftDemand")
        handle_create_schema_object_error(e)
    return daily_shift_demand
