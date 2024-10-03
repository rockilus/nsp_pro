from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import ShiftDemand
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
from routes.api_model import ShiftDemandMessage
from scripts.setup_database import coverage_db, shift_demand_db

router = APIRouter()


@router.post("/shift_demands/teams/{team_id}", status_code=201)
async def create_shift_demand(
    team_id: str,
    shift_demand: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a shift demand",
            )
        sd_data = msg_to_core_shift_demand(shift_demand)
        sd_created = shift_demand_db.create_shift_demand(sd_data)
        response = core_to_msg_shift_demand(sd_created)
    except Exception as e:
        log_info("Failed to create shift demand")
        handle_routes_errors(e)
    return response


@router.get("/shift-demands/teams/{team_id}")
async def get_shift_demands(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftDemandMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-coverages", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get shift demands")
        coverages = coverage_db.get_coverages(team_id)
        shift_demands = shift_demand_db.get_shift_demands_by_coverage_ids(
            [c.id for c in coverages]
        )
        response = [core_to_msg_shift_demand(sd) for sd in shift_demands]
    except Exception as e:
        log_info("Failed to get shift demands")
        handle_routes_errors(e)
    return response


@router.put("/shift_demands/{shift_demand_id}/teams/{team_id}")
async def update_shift_demand(
    team_id: str,
    req: ShiftDemandMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDemandMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a shift demand",
            )
        sd_data = msg_to_core_shift_demand(req)
        shift_demand = shift_demand_db.update_shift_demand(sd_data)
        response = core_to_msg_shift_demand(shift_demand)
    except Exception as e:
        log_info("Failed to update shift demand")
        handle_routes_errors(e)
    return response


@router.delete("/shift_demands/{shift_demand_id}/teams/{team_id}")
async def delete_shift_demand(
    shift_demand_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await authz_check(
        session.get_user_id(), "delete-shift-demand", "team", team_id
    ):
        raise NotAuthorizedError("You do not have permission to delete a shift demand")
    shift_demand_db.delete_shift_demand(shift_demand_id)
    return {"message": "Shift demand deleted successfully"}


# Mappers
# core to message
def core_to_msg_shift_demand(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    try:
        data = asdict(shift_demand)
    except Exception as e:
        log_info("Failed to convert ShiftDemand to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDemandMessage)
    try:
        sd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert ShiftDemand to ShiftDemandMessage")
        handle_message_errors(e)
    return sd_msg


# message to core
def msg_to_core_shift_demand(msg: ShiftDemandMessage) -> ShiftDemand:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        shift_demand = ShiftDemand(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftDemandMessage to ShiftDemand")
        handle_create_core_object_error(e)
    return shift_demand
