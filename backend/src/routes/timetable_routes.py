from bson import ObjectId
from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    timetable_db,
    timetable_category_db,
    timetable_property_db,
)

timetable_routes = Blueprint("timetable_routes", __name__)


@timetable_routes.route("/create-timetable", methods=["POST"])
def create_timetable():
    try:
        timetable_created = timetable_db.create_timetable()
        timetable_dict = timetable_created.to_dict()
        timetable_properties = (
            timetable_property_db.get_timetable_properties_by_timetable(
                timetable_created
            )
        )
        timetable_properties_dict = [
            timetable_property.to_dict()
            for timetable_property in timetable_properties
        ]
        timetable_response = {
            "timetable": timetable_dict,
            "timetable_properties": timetable_properties_dict,
        }
        response = jsonify({"timetable": timetable_response})
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@timetable_routes.route("/get-timetables", methods=["GET"])
def get_timetables():
    timetables = timetable_db.get_timetables()
    timetables_properties = [
        timetable_property_db.get_timetable_properties_by_timetable(timetable)
        for timetable in timetables
    ]
    timetables_dict = [timetable.to_dict() for timetable in timetables]
    timetables_properties_dict = [
        [
            timetable_property.to_dict()
            for timetable_property in timetable_properties
        ]
        for timetable_properties in timetables_properties
    ]
    timetables_response = []
    for timetable, timetable_properties in zip(
        timetables_dict, timetables_properties_dict
    ):
        timetable_dict = {
            "timetable": timetable,
            "timetable_properties": timetable_properties,
        }
        timetables_response.append(timetable_dict)
    response = jsonify({"timetables": timetables_response})
    return response, 200


@timetable_routes.route("/update-timetable-property", methods=["POST"])
def edit_timetable_property():
    input_received = request.get_json()
    timetable_id = input_received["timetable_id"]
    timetable_category_id = input_received["timetable_category_id"]
    value = input_received["value"]
    try:
        timetable = timetable_db.get_timetable_by_id(timetable_id)
        timetable_category = (
            timetable_category_db.get_timetable_category_by_id(
                timetable_category_id
            )
        )
        timetable_property = timetable_property_db.get_timetable_property_by_timetable_and_param(
            timetable, timetable_category
        )
        if not timetable_property:
            updated_timetable_property = (
                timetable_property_db.create_timetable_property(
                    timetable, timetable_category, value
                )
            )
        else:
            updated_timetable_property = (
                timetable_property_db.update_timetable_property(
                    timetable_property, value
                )
            )
        updated_timetable_property_dict = updated_timetable_property.to_dict()
        response = jsonify(
            {"updated_timetable_property": updated_timetable_property_dict}
        )
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@timetable_routes.route("/delete-timetable", methods=["DELETE"])
def delete_timetable():
    timetable_id_received = request.get_json()
    try:
        timetable = timetable_db.get_timetable_by_id(
            timetable_id_received["timetable_id"]
        )
        timetable_properties = (
            timetable_property_db.get_timetable_properties_by_timetable(
                timetable
            )
        )
        timetable_property_db.delete_timetable_properties(timetable_properties)
        timetable_db.delete_timetable(timetable)
        return jsonify({"message": "Worker deleted"}), 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


def is_valid_objectid(objectid_str: str) -> bool:
    try:
        ObjectId(objectid_str)
        return True
    # pylint: disable=broad-except
    # pylint: disable=bare-except
    except:  # noqa: E722
        return False
