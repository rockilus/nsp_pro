from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core import ShiftDimension, ShiftProperty
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
from routes.api_model import NewShiftDimensionMessage, ShiftDimensionMessage
from routes.shift_routes import core_to_msg_shift_property
from scripts.setup_database import (
    shift_db,
    shift_dimension_db,
    shift_property_db,
)
from services.shift_services import (
    delete_shift_dimension as delete_shift_dimension_service,
)

router = APIRouter()


@router.post("/shift-dimensions/teams/{team_id}")
async def create_shift_dimension(
    team_id: str,
    shift_dimension: ShiftDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> NewShiftDimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a shift dimension"
            )
        sd_data = api_msg_to_shift_dimension(shift_dimension)
        sd_created = shift_dimension_db.create_shift_dimension(sd_data)
        properties = []
        if sd_created.entry_type == "bool":
            if sd_created.is_rest:
                shifts = shift_db.get_rest_shifts(team_id)
            else:
                shifts = shift_db.get_work_shifts(team_id)
            for shift in shifts:
                properties.append(
                    shift_property_db.create_shift_property(
                        ShiftProperty(
                            id="",
                            value=False,
                            shift_id=shift.id,
                            shift_dimension_id=sd_created.id,
                        )
                    )
                )
        response = core_to_msg_new_shift_dimension(sd_created, properties)
    except Exception as e:
        log_info("Failed to create shift dimension")
        handle_routes_errors(e)
    return response


@router.get("/shift-dimensions/teams/{team_id}")
async def get_shift_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftDimensionMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-shift-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift dimensions"
            )
        shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
        response = [core_to_msg_shift_dimension(sd) for sd in shift_dimensions]
    except Exception as e:
        log_info("Failed to get shift dimensions")
        handle_routes_errors(e)
    return response


@router.put("/shift-dimensions/{shift_dimension_id}/teams/{team_id}")
async def update_shift_dimension(
    team_id: str,
    shift_dimension: ShiftDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftDimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-dimension", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a shift dimension"
            )
        shift_dimension_data = api_msg_to_shift_dimension(shift_dimension)
        updated_shift_dimension = shift_dimension_db.update_shift_dimension(
            shift_dimension_data
        )
        response = core_to_msg_shift_dimension(updated_shift_dimension)
    except Exception as e:
        log_info("Failed to update shift dimension")
        handle_routes_errors(e)
    return response


@router.delete("/shift-dimensions/{shift_dimension_id}/teams/{team_id}")
async def delete_shift_dimension(
    shift_dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift-dimension", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a shift dimension",
            )
        delete_shift_dimension_service(shift_dimension_id)
    except Exception as e:
        log_info("Failed to delete shift dimension")
        handle_routes_errors(e)
    return {"message": "shift deleted"}


# Mappers
# core to message
def core_to_msg_shift_dimension(
    shift_dimension: ShiftDimension,
) -> ShiftDimensionMessage:
    try:
        data = asdict(shift_dimension)
    except Exception as e:
        log_info("Failed to convert ShiftDimension to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDimensionMessage)
    try:
        sd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert ShiftDimension to ShiftDimensionMessage")
        handle_message_errors(e)
    return sd_msg


def core_to_msg_new_shift_dimension(
    shift_dimension: ShiftDimension,
    shift_properties: List[ShiftProperty],
) -> NewShiftDimensionMessage:
    try:
        as_dict = {
            "newDimension": core_to_msg_shift_dimension(shift_dimension),
            "newProperties": [
                core_to_msg_shift_property(sp) for sp in shift_properties
            ],
        }
    except Exception as e:
        log_info(
            "Failed to convert ShiftDimension and ShiftProperty list to dictionary"
        )
        raise MessageTypeError(str(e)) from e
    validator = TypeAdapter(NewShiftDimensionMessage)
    try:
        nsd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert ShiftDimension and ShiftProperty list to "
            + "NewShiftDimensionMessage"
        )
        handle_message_errors(e)
    return nsd_msg


# message to core
def api_msg_to_shift_dimension(
    msg: ShiftDimensionMessage,
) -> ShiftDimension:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        shift_dimension = ShiftDimension(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftDimensionMessage to ShiftDimension")
        handle_create_core_object_error(e)
    return shift_dimension
