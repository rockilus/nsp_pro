from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body

from core.shift import ShiftDimension
from scripts.setup_database import shift_dimension_db, shift_property_db

router = APIRouter()


@router.post("/shift-dimensions")
def create_shift_dimension(
    name: str = Body(...),
    entryType: str = Body(...),
    entryOptions: List[str] = Body(...),
):
    shift_dimension = shift_dimension_db.create_shift_dimension(
        name, entryType, entryOptions
    )
    return dataclass_to_dict(shift_dimension)


@router.get("/shift-dimensions")
def get_shift_dimensions():
    shift_dimensions = shift_dimension_db.get_shift_dimensions()
    if not shift_dimensions:
        shift_dimensions = shift_dimension_db.create_default_shift_dimensions()
    return [dataclass_to_dict(sd) for sd in shift_dimensions]


@router.put("/shift-dimensions/{shift_dimension_id}")
def update_shift_dimension(
    # pylint: disable=W0613
    shift_dimension_id: str,
    shift_dimension_data: Dict = Body(...),
):
    shift_dimension = dict_to_shift_dimension(shift_dimension_data)
    updated_shift_dimension = shift_dimension_db.update_shift_dimension(shift_dimension)
    return dataclass_to_dict(updated_shift_dimension)


@router.delete("/shift-dimensions/{shift_dimension_id}")
def delete_shift_dimension(shift_dimension_id: str):
    shift_property_db.delete_shift_properties_by_shift_dimension_id(shift_dimension_id)
    shift_dimension_db.delete_shift_dimension(shift_dimension_id)
    return {"message": "shift deleted"}


def dataclass_to_dict(obj: ShiftDimension) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_shift_dimension(data: Dict) -> ShiftDimension:
    data_snake = humps.decamelize(data)
    return ShiftDimension(**data_snake)
