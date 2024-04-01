from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core.shift import Shift, ShiftProperty
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
from routes.api_model import ShiftMessage, ShiftPropertyMessage
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shifts/teams/{team_id}", status_code=201)
async def create_shift(
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a shift")
        s_data = msg_to_core_to_shift(shift)
        shift_created = shift_db.create_shift(s_data)
        sd_bool = shift_dimension_db.get_shift_dimensions_by_entry_type("bool", team_id)
        sp_bool = []
        for wd in sd_bool:
            sp_bool.append(
                shift_property_db.create_shift_property(
                    ShiftProperty(
                        id="",
                        value=False,
                        shift_id=shift_created.id,
                        shift_dimension_id=wd.id,
                    )
                )
            )
        response = core_to_msg_shift_and_properties(shift_created, sp_bool)
    except Exception as e:
        log_info("Failed to create shift")
        handle_routes_errors(e)
    return response


@router.get("/shifts/teams/{team_id}")
async def get_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftMessage]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        shifts = shift_db.get_shifts(team_id)
        shifts_properties = [
            shift_property_db.get_shift_properties_by_shift(shift) for shift in shifts
        ]
        response = [
            core_to_msg_shift_and_properties(s, sp)
            for s, sp in zip(shifts, shifts_properties)
        ]
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.put("/shifts/{shift_id}/teams/{team_id}")
async def update_shift(
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update shifts")
        shift_data = msg_to_core_to_shift(shift)
        updated_shift = shift_db.update_shift(shift_data)
        shift_properties = shift_property_db.get_shift_properties_by_shift(
            updated_shift
        )
        response = core_to_msg_shift_and_properties(updated_shift, shift_properties)
    except Exception as e:
        log_info("Failed to update shift")
        handle_routes_errors(e)
    return response


@router.put("/shifts/{shift_id}/properties/{shift_dimension_id}/teams/{team_id}")
async def update_shift_property(
    team_id: str,
    shift_property: ShiftPropertyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftPropertyMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-property", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update shift properties"
            )
        sp_data = msg_to_core_shift_property(shift_property)
        if sp_data.id == "":
            new_sp = shift_property_db.create_shift_property(sp_data)
        else:
            new_sp = shift_property_db.update_shift_property(sp_data)
        response = core_to_msg_shift_property(new_sp)
    except Exception as e:
        log_info("Failed to update shift property")
        handle_routes_errors(e)
    return response


@router.delete("/shifts/{shift_id}/teams/{team_id}")
async def delete_shift(
    shift_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete shifts")
        shift_property_db.delete_shift_properties_by_shift_id(shift_id)
        shift_db.delete_shift(shift_id)
        response = {"message": "shift deleted"}
    except Exception as e:
        log_info("Failed to delete shift")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_shift_property(
    shift_property: ShiftProperty,
) -> ShiftPropertyMessage:
    try:
        data = asdict(shift_property)
    except Exception as e:
        log_info("Failed to convert ShiftProperty to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftPropertyMessage)
    try:
        sp_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert ShiftProperty to ShiftPropertyMessage")
        handle_message_errors(e)
    return sp_msg


def core_to_msg_shift_and_properties(
    shift: Shift, shift_properties: List[ShiftProperty]
) -> ShiftMessage:
    shift_properties_message = [
        core_to_msg_shift_property(wp) for wp in shift_properties
    ]
    try:
        data = asdict(shift)
    except Exception as e:
        log_info("Failed to convert Shift to dictionary")
        raise MessageTypeError(str(e)) from e
    data["shift_properties"] = shift_properties_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Shift to ShiftMessage")
        handle_message_errors(e)
    return s_msg


# message to core
def msg_to_core_to_shift(msg: ShiftMessage) -> Shift:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_properties"}
    try:
        shift = Shift(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftMessage to Shift")
        handle_create_core_object_error(e)
    return shift


def msg_to_core_shift_property(msg: ShiftPropertyMessage) -> ShiftProperty:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        shift_property = ShiftProperty(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftPropertyMessage to ShiftProperty")
        handle_create_core_object_error(e)
    return shift_property
