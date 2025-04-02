import time as time_module
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import (
    Attribute,
    LinkShift,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_shift_service
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
from src.routes.api_model import ShiftMessage, StaffingMessage
from src.routes.attribute_routes import core_to_msg_attribute
from src.routes.link_shift_routes import core_to_msg_link_shift
from src.services import ShiftService

router = APIRouter()


@router.post("/shifts/teams/{team_id}", status_code=201)
async def create_shift(
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    shift_service: ShiftService = Depends(get_shift_service),
) -> ShiftMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a shift")
        s_data = msg_to_core_to_shift(shift)
        shift_created, a_bool = shift_service.create_shift(s_data)
        response = core_to_msg_shift_and_attributes(shift_created, a_bool)
    except Exception as e:
        log_info("Failed to create shift")
        handle_routes_errors(e)
    return response


@router.get("/shifts/teams/{team_id}")
async def get_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftMessage]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        shifts = db_collections.shift_db.get_shifts_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [
            core_to_msg_shift_and_attributes(s, sp) for s, sp in zip(shifts, attributes)
        ]
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.get("/shifts/work/teams/{team_id}")
async def get_work_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftMessage]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        shifts = db_collections.shift_db.get_work_shifts_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [
            core_to_msg_shift_and_attributes(s, sp) for s, sp in zip(shifts, attributes)
        ]
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.get("/shifts/all/teams/{team_id}")
async def get_all_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftMessage]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        start_time = time_module.time()
        shifts = db_collections.shift_db.get_shifts(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [
            core_to_msg_shift_and_attributes(s, sp) for s, sp in zip(shifts, attributes)
        ]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get shifts: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.put("/shifts/{shift_id}/teams/{team_id}")
async def update_shift(
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    shift_service: ShiftService = Depends(get_shift_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update shifts")
        shift_data = msg_to_core_to_shift(shift)
        updated_shift, ls_change = shift_service.update_shift(shift_data)
        attributes = db_collections.attribute_db.get_attributes_by_owner_id(
            updated_shift.id
        )
        response = {
            "shift": core_to_msg_shift_and_attributes(updated_shift, attributes),
            "linkShifts": core_to_msg_ls_change(ls_change),
        }
    except Exception as e:
        log_info("Failed to update shift")
        handle_routes_errors(e)
    return response


@router.delete("/shifts/{shift_id}/teams/{team_id}")
async def delete_shift(
    shift_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    shift_service: ShiftService = Depends(get_shift_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete shifts")
        ls_change = shift_service.delete_shift(shift_id)
    except Exception as e:
        log_info("Failed to delete shift")
        handle_routes_errors(e)
    return {
        "message": "shift deleted",
        "linkShifts": core_to_msg_ls_change(ls_change),
    }


# Mappers
# core to message
def core_to_msg_shift_and_attributes(
    shift: Shift, attributes: List[Attribute]
) -> ShiftMessage:
    try:
        data = asdict(shift)
    except Exception as e:
        log_info("Failed to convert Shift to dictionary")
        raise MessageTypeError(str(e)) from e
    data["start_time"] = shift.start_time.timestamp()
    data["end_time"] = shift.end_time.timestamp()
    data["attributes"] = [core_to_msg_attribute(a) for a in attributes]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Shift to ShiftMessage")
        handle_message_errors(e)
    return s_msg


def core_to_msg_ls_change(
    ls_change: Dict[str, List[LinkShift | str]] | None,
) -> Dict:
    if ls_change is None:
        return {"udpated": [], "deleted": []}
    return {
        "updated": [
            core_to_msg_link_shift(ls)
            for ls in ls_change.get("updated", [])
            if isinstance(ls, LinkShift)
        ],
        "deleted": ls_change.get("deleted", []),
    }


# message to core
def msg_to_core_staffing(msg: StaffingMessage) -> Staffing:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        staffing = Staffing(**data_snake)
    except Exception as e:
        log_info("Failed to convert StaffingMessage to Staffing")
        handle_create_schema_object_error(e)
    return staffing


def msg_to_core_to_shift(msg: ShiftMessage) -> Shift:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "attributes"}
    data_snake["start_time"] = datetime.fromtimestamp(
        data_snake["start_time"], timezone.utc
    )
    data_snake["end_time"] = datetime.fromtimestamp(
        data_snake["end_time"], timezone.utc
    )
    data_snake["shift_type"] = ShiftType(data_snake["shift_type"])
    data_snake["rest_type"] = ShiftRestType(data_snake["rest_type"])
    data_snake["leave_type"] = ShiftLeaveType(data_snake["leave_type"])
    data_snake["staffing"] = [msg_to_core_staffing(s) for s in msg.staffing]
    try:
        shift = Shift(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftMessage to Shift")
        handle_create_schema_object_error(e)
    return shift
