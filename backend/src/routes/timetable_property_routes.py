from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    timetable_db,
    timetable_category_db,
    timetable_property_db,
    timetable_time_db,
)

timetable_property_routes = Blueprint("timetable_property_routes", __name__)


@timetable_property_routes.route("/create-timetable-property", methods=["POST"])
def create_timetable():
    info_received = request.get_json()
    try:
        timetable = timetable_db.get_timetable_by_id(info_received["timetable_id"])
        timetable_category = timetable_category_db.get_timetable_category_by_id(
            info_received["timetable_category_id"]
        )
        timetable_time = timetable_time_db.get_timetable_time_by_id(
            info_received["timetable_time_id"]
        )
        timetable_property_created = timetable_property_db.create_timetable_property(
            timetable,
            timetable_category,
            timetable_time,
            info_received["value"],
        )
        timetable_property_dict = timetable_property_created.to_dict()
        # pylint: disable=R0801
        response = jsonify({"timetable_property": timetable_property_dict})
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


# @timetable_routes.route("/get-timetables", methods=["GET"])
# def get_timetables():
#     try:
#         timetables = timetable_db.get_timetables()
#         timetables_times = [
#             timetable_time_db.get_timetable_times_by_timetable(timetable)
#             for timetable in timetables
#         ]
#         timetables_categories = [
#             timetable_category_db.get_timetable_categories_by_timetable(
#                 timetable
#             )
#             for timetable in timetables
#         ]
#         timetables_properties = [
#             timetable_property_db.get_timetable_properties_by_timetable(
#                 timetable
#             )
#             for timetable in timetables
#         ]
#         timetables_dict = [timetable.to_dict() for timetable in timetables]
#         timetables_times_dict = [
#             [timetable_time.to_dict() for timetable_time in timetable_times]
#             for timetable_times in timetables_times
#         ]
#         timetables_categories_dict = [
#             [
#                 timetable_category.to_dict()
#                 for timetable_category in timetable_categories
#             ]
#             for timetable_categories in timetables_categories
#         ]
#         timetables_properties_dict = [
#             [
#                 timetable_property.to_dict()
#                 for timetable_property in timetable_properties
#             ]
#             for timetable_properties in timetables_properties
#         ]
#         timetables_response = []
#         for (
#             timetable,
#             timetable_times,
#             timetable_categories,
#             timetable_properties,
#         ) in zip(
#             timetables_dict,
#             timetables_times_dict,
#             timetables_categories_dict,
#             timetables_properties_dict,
#         ):
#             timetable_dict = {
#                 "timetable": timetable,
#                 "timetable_times": timetable_times,
#                 "timetable_categories": timetable_categories,
#                 "timetable_properties": timetable_properties,
#             }
#             timetables_response.append(timetable_dict)
#         response = jsonify({"timetables": timetables_response})
#         return response, 200
#     except NotUniqueError as e:
#         print(e)
#         return jsonify({"error": f"{str(e)}"}), 404


@timetable_property_routes.route("/update-timetable-property", methods=["POST"])
def update_timetable_property():
    info_received = request.get_json()
    timetable_property_id = info_received["timetable_property_id"]
    value = info_received["value"]
    try:
        timetable_property = timetable_property_db.get_timetable_property_by_id(
            timetable_property_id
        )
        timetable_property_updated = timetable_property_db.update_timetable_property(
            timetable_property, value
        )
        timetable_property_updated_dict = timetable_property_updated.to_dict()
        response = jsonify(
            {"timetable_property_updated": timetable_property_updated_dict}
        )
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@timetable_property_routes.route("/delete-timetable-property", methods=["DELETE"])
def delete_timetable():
    info_received = request.get_json()
    try:
        timetable_property = timetable_property_db.get_timetable_property_by_id(
            info_received["timetable_property_id"]
        )
        timetable_property_db.delete_timetable_property(timetable_property)
        return jsonify({"message": "Timetable Property deleted"}), 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
