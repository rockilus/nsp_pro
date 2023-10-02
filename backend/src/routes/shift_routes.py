from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.shift import Shift, ShiftProperty
from routes.api_model import ShiftMessage, ShiftPropertyMessage
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shifts", status_code=201)
def create_shift() -> ShiftMessage:
    shift_created = shift_db.create_shift()
    shift_properties = shift_property_db.get_shift_properties_by_shift(shift_created)
    return shift_and_properties_to_api_msg(shift_created, shift_properties)


@router.get("/shifts")
def get_shifts() -> List[ShiftMessage]:
    shifts = shift_db.get_shifts()
    shifts_properties = [
        shift_property_db.get_shift_properties_by_shift(shift) for shift in shifts
    ]
    return [
        shift_and_properties_to_api_msg(s, sp)
        for s, sp in zip(shifts, shifts_properties)
    ]


@router.put("/shifts/{shift_id}")
def update_shift(shift_id: str, shift: ShiftMessage) -> ShiftMessage:
    existing_shift = shift_db.get_shift_by_id(shift_id)
    if not existing_shift:
        raise HTTPException(status_code=404, detail="Shift does not exist")
    shift_data = api_msg_to_shift(shift)
    updated_shift = shift_db.update_shift(shift_data)
    shift_properties = shift_property_db.get_shift_properties_by_shift(updated_shift)
    return shift_and_properties_to_api_msg(updated_shift, shift_properties)


@router.put("/shifts/{shift_id}/properties/{shift_dimension_id}")
def update_shift_property(
    shift_id: str, shift_dimension_id: str, value: str = Body(...)
) -> ShiftPropertyMessage:
    shift = shift_db.get_shift_by_id(shift_id)
    shift_dimension = shift_dimension_db.get_shift_dimension_by_id(shift_dimension_id)
    shift_property = shift_property_db.get_shift_property_by_shift_and_dimension(
        shift, shift_dimension
    )
    if not shift_property:
        updated_shift_property = shift_property_db.create_shift_property(
            shift, shift_dimension, value
        )
    else:
        shift_property.value = value
        updated_shift_property = shift_property_db.update_shift_property(shift_property)
    return shift_property_to_api_msg(updated_shift_property)


@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: str) -> Dict:
    shift_property_db.delete_shift_properties_by_shift_id(shift_id)
    shift_db.delete_shift(shift_id)
    return {"message": "shift deleted"}


def shift_property_to_api_msg(
    shift_property: ShiftProperty,
) -> ShiftPropertyMessage:
    data = asdict(shift_property)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftPropertyMessage)
    return validator.validate_python(as_dict)


def shift_and_properties_to_api_msg(
    shift: Shift, shift_properties: List[ShiftProperty]
) -> ShiftMessage:
    shift_properties_message = [
        shift_property_to_api_msg(wp) for wp in shift_properties
    ]
    data = asdict(shift)
    data["shift_properties"] = shift_properties_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftMessage)
    return validator.validate_python(as_dict)


def api_msg_to_shift(msg: ShiftMessage) -> Shift:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "shift_properties"}
    return Shift(**data_snake)
