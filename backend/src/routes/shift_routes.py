from dataclasses import asdict
from typing import Dict, Union

import humps
from fastapi import APIRouter, Body

from core.shift import Shift, ShiftProperty
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/create-shift")
def create_shift():
    shift_created = shift_db.create_shift()
    shift_properties = shift_property_db.get_shift_properties_by_shift(shift_created)
    return {
        "id": shift_created.id,
        "shiftProperties": [dataclass_to_dict(sp) for sp in shift_properties],
    }


@router.get("/get-shifts")
def get_shifts():
    shifts = shift_db.get_shifts()
    shifts_properties = [
        shift_property_db.get_shift_properties_by_shift(shift) for shift in shifts
    ]
    shifts_response = [
        {
            "id": shift.id,
            "shiftProperties": [dataclass_to_dict(sp) for sp in shift_properties],
        }
        for shift, shift_properties in zip(shifts, shifts_properties)
    ]
    return shifts_response


@router.post("/update-shift-property")
def edit_shift_property(
    shiftId: str = Body(...), shiftDimensionId: str = Body(...), value: str = Body(...)
):
    shift = shift_db.get_shift_by_id(shiftId)
    shift_dimension = shift_dimension_db.get_shift_dimension_by_id(shiftDimensionId)
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
    return dataclass_to_dict(updated_shift_property)


@router.delete("/delete-shift/{shift_id}")
def delete_shift(shift_id: str):
    shift_property_db.delete_shift_properties_by_shift_id(shift_id)
    shift_db.delete_shift(shift_id)
    return {"message": "shift deleted"}


def dataclass_to_dict(obj: Union[Shift, ShiftProperty]) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_shift_property(data: Dict) -> ShiftProperty:
    data_snake = humps.decamelize(data)
    return ShiftProperty(**data_snake)
