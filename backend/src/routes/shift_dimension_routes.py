from dataclasses import asdict
from typing import Dict

import humps
from flask import Blueprint, jsonify, request
from core.shift import ShiftDimension
from scripts.setup_database import shift_dimension_db, shift_property_db

shift_dimension_routes = Blueprint("shift_dimension_routes", __name__)


@shift_dimension_routes.route("/create-shift-dimension", methods=["POST"])
def create_shift_dimension():
    new_shift_dimension = request.get_json()
    if (
        "name" in new_shift_dimension
        and "entryType" in new_shift_dimension
        and "entryOptions" in new_shift_dimension
    ):
        name = new_shift_dimension["name"]
        entry_type = new_shift_dimension["entryType"]
        entry_options = new_shift_dimension["entryOptions"]
    shift_dimension = shift_dimension_db.create_shift_dimension(
        name, entry_type, entry_options
    )
    response = jsonify(dataclass_to_dict(shift_dimension))
    return response, 200


@shift_dimension_routes.route("/get-shift-dimensions", methods=["GET"])
def get_shift_dimensions():
    shift_dimensions = shift_dimension_db.get_shift_dimensions()
    if not shift_dimensions:
        shift_dimensions = shift_dimension_db.create_default_shift_dimensions()
    response = jsonify([dataclass_to_dict(sd) for sd in shift_dimensions])
    return response, 200


@shift_dimension_routes.route("/update-shift-dimension", methods=["POST"])
def update_shift_dimension():
    info_received = request.get_json()
    shift_dimension = dict_to_shift_dimension(info_received)
    shift_dimension_updated = shift_dimension_db.update_shift_dimension(shift_dimension)
    response = jsonify(dataclass_to_dict(shift_dimension_updated))
    return response, 200


@shift_dimension_routes.route("/delete-shift-dimension", methods=["DELETE"])
def delete_shift_dimension():
    info_received = request.get_json()
    shift_property_db.delete_shift_properties_by_shift_dimension_id(info_received["id"])
    shift_dimension_db.delete_shift_dimension(info_received["id"])
    return jsonify({"message": "shift deleted"}), 200


def dataclass_to_dict(obj: ShiftDimension) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_shift_dimension(data: dict) -> ShiftDimension:
    data_snake = humps.decamelize(data)
    return ShiftDimension(**data_snake)
