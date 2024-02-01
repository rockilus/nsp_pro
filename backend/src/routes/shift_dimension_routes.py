from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.shift import ShiftDimension, ShiftProperty
from routes.api_model import NewShiftDimensionMessage, ShiftDimensionMessage
from routes.shift_routes import shift_property_to_api_msg
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shift-dimensions")
def create_shift_dimension(
    name: str = Body(...),
    entry_type: str = Body(..., alias="entryType"),
    entry_options: List[str] = Body(..., alias="entryOptions"),
) -> NewShiftDimensionMessage:
    shift_dimension = shift_dimension_db.create_shift_dimension(
        name, entry_type, entry_options
    )
    properties = []
    if entry_type == "bool":
        shifts = shift_db.get_shifts()
        for shift in shifts:
            properties.append(
                shift_property_db.create_shift_property(shift, shift_dimension, False)
            )
    return new_shift_dimension_to_api_msg(shift_dimension, properties)


@router.get("/shift-dimensions")
def get_shift_dimensions() -> List[ShiftDimensionMessage]:
    shift_dimensions = shift_dimension_db.get_shift_dimensions()
    return [shift_dimension_to_api_msg(sd) for sd in shift_dimensions]


@router.put("/shift-dimensions/{shift_dimension_id}")
def update_shift_dimension(
    # pylint: disable=W0613
    shift_dimension_id: str,
    shift_dimension: ShiftDimensionMessage,
) -> ShiftDimensionMessage:
    existing_shift_dim = shift_dimension_db.get_shift_dimension_by_id(
        shift_dimension_id
    )
    if not existing_shift_dim:
        raise HTTPException(status_code=404, detail="Shift Dimension does not exist")
    shift_dimension_data = api_msg_to_shift_dimension(shift_dimension)
    updated_shift_dimension = shift_dimension_db.update_shift_dimension(
        shift_dimension_data
    )
    return shift_dimension_to_api_msg(updated_shift_dimension)


@router.delete("/shift-dimensions/{shift_dimension_id}")
def delete_shift_dimension(shift_dimension_id: str) -> Dict:
    shift_property_db.delete_shift_properties_by_shift_dimension_id(shift_dimension_id)
    shift_dimension_db.delete_shift_dimension(shift_dimension_id)
    return {"message": "shift deleted"}


def shift_dimension_to_api_msg(
    shift_dimension: ShiftDimension,
) -> ShiftDimensionMessage:
    data = asdict(shift_dimension)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftDimensionMessage)
    return validator.validate_python(as_dict)


def new_shift_dimension_to_api_msg(
    shift_dimension: ShiftDimension,
    shift_properties: List[ShiftProperty],
) -> NewShiftDimensionMessage:
    as_dict = {
        "newDimension": shift_dimension_to_api_msg(shift_dimension),
        "newProperties": [shift_property_to_api_msg(sp) for sp in shift_properties],
    }
    validator = TypeAdapter(NewShiftDimensionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_shift_dimension(
    msg: ShiftDimensionMessage,
) -> ShiftDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return ShiftDimension(**data_snake)
