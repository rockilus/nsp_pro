from dataclasses import asdict
from datetime import datetime, timezone
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import ShiftDemand
from shared.schemas.errors import handle_create_schema_object_error

from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from integrations.authorization import authz_check
from routes.api_model import ShiftDemandMessage
from scripts.setup_database import coverage_db, shift_demand_db
from services.shift_demand_services import (
    delete_shift_demand as delete_shift_demand_service,
)
from services.shift_demand_services import (
    update_shift_demand as update_shift_demand_service,
)

router = APIRouter()


@router.post("/shift-demands/teams/{team_id}", status_code=201)
async def create_shift_demands(
    team_id: str,
    shift_demands: List[ShiftDemandMessage],
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftDemandMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-demand", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a shift demand",
            )
        sds_data = [msg_to_core_shift_demand(sd) for sd in shift_demands]
        sd_created = shift_demand_db.create_shift_demands(sds_data)
        response = [core_to_msg_shift_demand(sd) for sd in sd_created]
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


@router.put("/shift-demands/{shift_demand_id}/teams/{team_id}")
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
        shift_demand = update_shift_demand_service(sd_data)
        response = core_to_msg_shift_demand(shift_demand)
    except Exception as e:
        log_info("Failed to update shift demand")
        handle_routes_errors(e)
    return response


@router.delete("/shift-demands/teams/{team_id}")
async def delete_shift_demands(
    team_id: str,
    shift_demand_ids: List[str],
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await authz_check(
        session.get_user_id(), "delete-shift-demand", "team", team_id
    ):
        raise NotAuthorizedError("You do not have permission to delete a shift demand")
    for shift_demand_id in shift_demand_ids:
        delete_shift_demand_service(shift_demand_id)
    return {"message": "Shift demand deleted successfully"}


# Mappers
# core to message
def core_to_msg_shift_demand(shift_demand: ShiftDemand) -> ShiftDemandMessage:
    try:
        data = asdict(shift_demand)
    except Exception as e:
        log_info("Failed to convert ShiftDemand to dictionary")
        raise MessageTypeError(str(e)) from e
    data["last_modified"] = shift_demand.last_modified.timestamp()
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
    data_snake["last_modified"] = datetime.fromtimestamp(
        data_snake["last_modified"], tz=timezone.utc
    )
    try:
        shift_demand = ShiftDemand(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftDemandMessage to ShiftDemand")
        handle_create_schema_object_error(e)
    return shift_demand
