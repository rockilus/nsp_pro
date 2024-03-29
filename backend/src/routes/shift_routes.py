from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.shift import Shift, ShiftProperty
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import ShiftMessage, ShiftPropertyMessage
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shifts/teams/{team_id}", status_code=201)
async def create_shift(
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftMessage:
    if not await authz_check(session.get_user_id(), "create-shift", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a shift",
        )
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
    return core_to_msg_shift_and_properties(shift_created, sp_bool)


@router.get("/shifts/teams/{team_id}")
async def get_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ShiftMessage]:
    if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to read shifts",
        )
    shifts = shift_db.get_shifts(team_id)
    shifts_properties = [
        shift_property_db.get_shift_properties_by_shift(shift) for shift in shifts
    ]
    return [
        core_to_msg_shift_and_properties(s, sp)
        for s, sp in zip(shifts, shifts_properties)
    ]


@router.put("/shifts/{shift_id}/teams/{team_id}")
async def update_shift(
    shift_id: str,
    team_id: str,
    shift: ShiftMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftMessage:
    if not await authz_check(session.get_user_id(), "update-shift", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update shifts",
        )
    existing_shift = shift_db.get_shift_by_id(shift_id)
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift does not exist")
    shift_data = msg_to_core_to_shift(shift)
    updated_shift = shift_db.update_shift(shift_data)
    shift_properties = shift_property_db.get_shift_properties_by_shift(updated_shift)
    return core_to_msg_shift_and_properties(updated_shift, shift_properties)


@router.put("/shifts/{shift_id}/properties/{shift_dimension_id}/teams/{team_id}")
async def update_shift_property(
    team_id: str,
    shift_property: ShiftPropertyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ShiftPropertyMessage:
    if not await authz_check(
        session.get_user_id(), "update-shift-property", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update shift properties",
        )
    sp_data = msg_to_core_shift_property(shift_property)
    if sp_data.id == "":
        new_sp = shift_property_db.create_shift_property(sp_data)
    else:
        new_sp = shift_property_db.update_shift_property(sp_data)
    return core_to_msg_shift_property(new_sp)


@router.delete("/shifts/{shift_id}/teams/{team_id}")
async def delete_shift(
    shift_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await authz_check(session.get_user_id(), "delete-shift", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete shifts",
        )
    shift_property_db.delete_shift_properties_by_shift_id(shift_id)
    shift_db.delete_shift(shift_id)
    return {"message": "shift deleted"}


# Mappers
# core to message
def core_to_msg_shift_property(
    shift_property: ShiftProperty,
) -> ShiftPropertyMessage:
    data = asdict(shift_property)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftPropertyMessage)
    return validator.validate_python(as_dict)


def core_to_msg_shift_and_properties(
    shift: Shift, shift_properties: List[ShiftProperty]
) -> ShiftMessage:
    shift_properties_message = [
        core_to_msg_shift_property(wp) for wp in shift_properties
    ]
    data = asdict(shift)
    data["shift_properties"] = shift_properties_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftMessage)
    return validator.validate_python(as_dict)


# message to core
def msg_to_core_to_shift(msg: ShiftMessage) -> Shift:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_properties"}
    return Shift(**data_snake)


def msg_to_core_shift_property(msg: ShiftPropertyMessage) -> ShiftProperty:
    data_snake = humps.decamelize(msg.model_dump())
    return ShiftProperty(**data_snake)
