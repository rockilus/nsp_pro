from dataclasses import asdict
from typing import Dict, Union

import humps
from flask import Blueprint, jsonify, request
from core.shift import Shift, ShiftProperty
from scripts.setup_database import (
    shift_db,
    shift_dimension_db,
    shift_property_db,
)

shift_routes = Blueprint("shift_routes", __name__)


@shift_routes.route("/create-shift", methods=["POST"])
def create_shift():
    shift_created = shift_db.create_shift()
    shift_properties = shift_property_db.get_shift_properties_by_shift(shift_created)
    shift_response = {
        "id": shift_created.id,
        "shiftProperties": [dataclass_to_dict(sp) for sp in shift_properties],
    }
    response = jsonify(shift_response)
    return response, 200


@shift_routes.route("/get-shifts", methods=["GET"])
def get_shifts():
    shifts = shift_db.get_shifts()
    shifts_properties = [
        shift_property_db.get_shift_properties_by_shift(shift) for shift in shifts
    ]
    shifts_response = []
    for shift, shift_properties in zip(shifts, shifts_properties):
        shift_dict = {
            "id": shift.id,
            "shiftProperties": [dataclass_to_dict(sp) for sp in shift_properties],
        }
        shifts_response.append(shift_dict)
    response = jsonify(shifts_response)
    return response, 200


@shift_routes.route("/update-shift-property", methods=["POST"])
def edit_shift_property():
    input_received = request.get_json()
    shift_id = input_received["shiftId"]
    shift_dimension_id = input_received["shiftDimensionId"]
    value = input_received["value"]
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
    response = jsonify(dataclass_to_dict(updated_shift_property))
    return response, 200


@shift_routes.route("/delete-shift", methods=["DELETE"])
def delete_shift():
    shift_id_received = request.get_json()
    shift_property_db.delete_shift_properties_by_shift_id(shift_id_received["id"])
    shift_db.delete_shift(shift_id_received["id"])
    return jsonify({"message": "shift deleted"}), 200


def dataclass_to_dict(obj: Union[Shift, ShiftProperty]) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_shift_property(data: dict) -> ShiftProperty:
    data_snake = humps.decamelize(data)
    return ShiftProperty(**data_snake)
