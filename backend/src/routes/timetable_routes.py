from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    timetable_db,
    timetable_category_db,
    timetable_property_db,
    timetable_time_db,
)

timetable_routes = Blueprint("timetable_routes", __name__)


@timetable_routes.route("/create-timetable", methods=["POST"])
def create_timetable():
    try:
        timetable_created = timetable_db.create_timetable()
        timetable_times_created = timetable_time_db.create_default_timetable_times(
            timetable_created
        )
        timetable_category_created = (
            timetable_category_db.create_default_timetable_category(timetable_created)
        )
        timetable_dict = timetable_created.to_dict()
        timetable_times_dict = [
            timetable_time.to_dict() for timetable_time in timetable_times_created
        ]
        timetable_category_dict = timetable_category_created.to_dict()
        timetable_response = {
            "timetable": timetable_dict,
            "timetable_times": timetable_times_dict,
            "timetable_categories": [timetable_category_dict],
            "timetable_properties": [],
        }
        response = jsonify(timetable_response)
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


# pylint: disable=too-many-locals
@timetable_routes.route("/get-timetables", methods=["GET"])
def get_timetables():
    try:
        timetables = timetable_db.get_timetables()
        timetables_times = [
            timetable_time_db.get_timetable_times_by_timetable(timetable)
            for timetable in timetables
        ]
        timetables_categories = [
            timetable_category_db.get_timetable_categories_by_timetable(timetable)
            for timetable in timetables
        ]
        timetables_properties = [
            timetable_property_db.get_timetable_properties_by_timetable(timetable)
            for timetable in timetables
        ]
        timetables_dict = [timetable.to_dict() for timetable in timetables]
        timetables_times_dict = [
            [timetable_time.to_dict() for timetable_time in timetable_times]
            for timetable_times in timetables_times
        ]
        timetables_categories_dict = [
            [
                timetable_category.to_dict()
                for timetable_category in timetable_categories
            ]
            for timetable_categories in timetables_categories
        ]
        timetables_properties_dict = [
            [
                timetable_property.to_dict()
                for timetable_property in timetable_properties
            ]
            for timetable_properties in timetables_properties
        ]
        timetables_response = []
        for (
            timetable,
            timetable_times,
            timetable_categories,
            timetable_properties,
        ) in zip(
            timetables_dict,
            timetables_times_dict,
            timetables_categories_dict,
            timetables_properties_dict,
        ):
            timetable_dict = {
                "timetable": timetable,
                "timetable_times": timetable_times,
                "timetable_categories": timetable_categories,
                "timetable_properties": timetable_properties,
            }
            timetables_response.append(timetable_dict)
        # pylint: disable=R0801
        response = jsonify({"timetables": timetables_response})
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@timetable_routes.route("/delete-timetable", methods=["DELETE"])
def delete_timetable():
    info_received = request.get_json()
    try:
        timetable = timetable_db.get_timetable_by_id(info_received["timetable_id"])
        timetable_times = timetable_time_db.get_timetable_times_by_timetable(timetable)
        timetable_categories = (
            timetable_category_db.get_timetable_categories_by_timetable(timetable)
        )
        timetable_properties = (
            timetable_property_db.get_timetable_properties_by_timetable(timetable)
        )
        for timetable_property in timetable_properties:
            timetable_property_db.delete_timetable_property(timetable_property)
        for timetable_category in timetable_categories:
            timetable_category_db.delete_timetable_category(timetable_category)
        for timetable_time in timetable_times:
            timetable_time_db.delete_timetable_time(timetable_time)
        timetable_db.delete_timetable(timetable)
        return jsonify({"message": "Worker deleted"}), 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
