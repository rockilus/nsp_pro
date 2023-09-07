from bson import ObjectId
from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    shift_db,
    shift_param_db,
    shift_property_db,
)

shift_routes = Blueprint("shift_routes", __name__)


@shift_routes.route("/create-shift", methods=["POST"])
def create_shift():
    try:
        shift_created = shift_db.create_shift()
        shift_dict = shift_created.to_dict()
        shift_properties = shift_property_db.get_shift_properties_by_shift(
            shift_created
        )
        shift_properties_dict = [
            shift_property.to_dict() for shift_property in shift_properties
        ]
        shift_response = {
            "shift": shift_dict,
            "shift_properties": shift_properties_dict,
        }
        response = jsonify({"shift": shift_response})
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@shift_routes.route("/get-shifts", methods=["GET"])
def get_shifts():
    shifts = shift_db.get_shifts()
    shifts_properties = [
        shift_property_db.get_shift_properties_by_shift(shift)
        for shift in shifts
    ]
    shifts_dict = [shift.to_dict() for shift in shifts]
    shifts_properties_dict = [
        [shift_property.to_dict() for shift_property in shift_properties]
        for shift_properties in shifts_properties
    ]
    shifts_response = []
    for shift, shift_properties in zip(shifts_dict, shifts_properties_dict):
        shift_dict = {
            "shift": shift,
            "shift_properties": shift_properties,
        }
        shifts_response.append(shift_dict)
    response = jsonify({"shifts": shifts_response})
    return response, 200


@shift_routes.route("/update-shift-property", methods=["POST"])
def edit_shift_property():
    input_received = request.get_json()
    shift_id = input_received["shift_id"]
    shift_param_id = input_received["shift_param_id"]
    value = input_received["value"]
    try:
        shift = shift_db.get_shift_by_id(shift_id)
        shift_param = shift_param_db.get_shift_param_by_id(shift_param_id)
        shift_property = (
            shift_property_db.get_shift_property_by_shift_and_param(
                shift, shift_param
            )
        )
        if not shift_property:
            updated_shift_property = shift_property_db.create_shift_property(
                shift, shift_param, value
            )
        else:
            updated_shift_property = shift_property_db.update_shift_property(
                shift_property, value
            )
        updated_shift_property_dict = updated_shift_property.to_dict()
        response = jsonify(
            {"updated_shift_property": updated_shift_property_dict}
        )
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@shift_routes.route("/delete-shift", methods=["DELETE"])
def delete_shift():
    shift_id_received = request.get_json()
    try:
        shift = shift_db.get_shift_by_id(shift_id_received["shift_id"])
        shift_properties = shift_property_db.get_shift_properties_by_shift(
            shift
        )
        shift_property_db.delete_shift_properties(shift_properties)
        shift_db.delete_shift(shift)
        return jsonify({"message": "shift deleted"}), 200
    # pylint: disable=broad-except,R0801
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


def is_valid_objectid(objectid_str: str) -> bool:
    # pylint: disable=R0801
    try:
        ObjectId(objectid_str)
        return True
    # pylint: disable=broad-except
    # pylint: disable=bare-except
    except:  # noqa: E722
        return False
