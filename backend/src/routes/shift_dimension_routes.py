from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.shift import ShiftDimension
from routes.api_model import ShiftDimensionMessage
from scripts.setup_database import shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shift-dimensions")
def create_shift_dimension(
    name: str = Body(...),
    entryType: str = Body(...),
    entryOptions: List[str] = Body(...),
) -> ShiftDimensionMessage:
    shift_dimension = shift_dimension_db.create_shift_dimension(
        name, entryType, entryOptions
    )
    return shift_dimension_to_api_msg(shift_dimension)


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


def api_msg_to_shift_dimension(
    msg: ShiftDimensionMessage,
) -> ShiftDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return ShiftDimension(**data_snake)
