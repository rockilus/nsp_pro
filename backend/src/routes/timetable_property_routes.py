from bson import ObjectId
from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    timetable_db,
    timetable_category_db,
    timetable_property_db,
    timetable_time_db,
)

timetable_property_routes = Blueprint("timetable_property_routes", __name__)


@timetable_property_routes.route(
    "/create-timetable-property", methods=["POST"]
)
def create_timetable():
    info_received = request.get_json()
    try:
        timetable = timetable_db.get_timetable_by_id(
            info_received["timetable_id"]
        )
        timetable_category = (
            timetable_category_db.get_timetable_category_by_id(
                info_received["timetable_category_id"]
            )
        )
        timetable_time = timetable_time_db.get_timetable_time_by_id(
            info_received["timetable_time_id"]
        )
        timetable_property_created = (
            timetable_property_db.create_timetable_property(
                timetable,
                timetable_category,
                timetable_time,
                info_received["value"],
            )
        )
        timetable_property_dict = timetable_property_created.to_dict()
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


# @timetable_routes.route("/update-timetable-property", methods=["POST"])
# def edit_timetable_property():
#     input_received = request.get_json()
#     timetable_id = input_received["timetable_id"]
#     timetable_category_id = input_received["timetable_category_id"]
#     value = input_received["value"]
#     try:
#         timetable = timetable_db.get_timetable_by_id(timetable_id)
#         timetable_category = (
#             timetable_category_db.get_timetable_category_by_id(
#                 timetable_category_id
#             )
#         )
#         timetable_property = timetable_property_db.get_timetable_property_by_timetable_and_param(
#             timetable, timetable_category
#         )
#         if not timetable_property:
#             updated_timetable_property = (
#                 timetable_property_db.create_timetable_property(
#                     timetable, timetable_category, value
#                 )
#             )
#         else:
#             updated_timetable_property = (
#                 timetable_property_db.update_timetable_property(
#                     timetable_property, value
#                 )
#             )
#         updated_timetable_property_dict = updated_timetable_property.to_dict()
#         response = jsonify(
#             {"updated_timetable_property": updated_timetable_property_dict}
#         )
#         return response, 200
#     # pylint: disable=broad-except
#     except Exception as e:  # noqa: E722
#         print(e)
#         return jsonify({"error": f"{str(e)}"}), 404


# @timetable_routes.route("/delete-timetable", methods=["DELETE"])
# def delete_timetable():
#     info_received = request.get_json()
#     try:
#         timetable = timetable_db.get_timetable_by_id(
#             info_received["timetable_id"]
#         )
#         timetable_times = timetable_time_db.get_timetable_times_by_timetable(
#             timetable
#         )
#         timetable_categories = (
#             timetable_category_db.get_timetable_categories_by_timetable(
#                 timetable
#             )
#         )
#         timetable_properties = (
#             timetable_property_db.get_timetable_properties_by_timetable(
#                 timetable
#             )
#         )
#         for timetable_property in timetable_properties:
#             timetable_property_db.delete_timetable_property(timetable_property)
#         for timetable_category in timetable_categories:
#             timetable_category_db.delete_timetable_category(timetable_category)
#         for timetable_time in timetable_times:
#             timetable_time_db.delete_timetable_time(timetable_time)
#         timetable_db.delete_timetable(timetable)
#         return jsonify({"message": "Worker deleted"}), 200
#     # pylint: disable=broad-except
#     except Exception as e:
#         print(e)
#         return jsonify({"error": f"{str(e)}"}), 404


def is_valid_objectid(objectid_str: str) -> bool:
    try:
        ObjectId(objectid_str)
        return True
    # pylint: disable=broad-except
    # pylint: disable=bare-except
    except:  # noqa: E722
        return False
