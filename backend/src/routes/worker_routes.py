from typing import List

from bson import ObjectId
from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import (
    worker_db,
    worker_param_db,
    worker_property_db,
)

worker_routes = Blueprint("worker_routes", __name__)


@worker_routes.route("/create-worker", methods=["POST"])
def create_worker():
    try:
        worker_created = worker_db.create_worker()
        worker_dict = worker_created.to_dict()
        worker_properties = worker_property_db.get_worker_properties_by_worker(
            worker_created
        )
        worker_properties_dict = [
            worker_property.to_dict() for worker_property in worker_properties
        ]
        worker_response = {
            "id": worker_dict["_id"],
            "workerProperties": worker_properties_to_api(worker_properties_dict),
        }
        response = jsonify(worker_response)
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@worker_routes.route("/get-workers", methods=["GET"])
def get_workers():
    workers = worker_db.get_workers()
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker(worker) for worker in workers
    ]
    workers_dict = [worker.to_dict() for worker in workers]
    workers_properties_dict = [
        [worker_property.to_dict() for worker_property in worker_properties]
        for worker_properties in workers_properties
    ]
    workers_response = []
    for worker, worker_properties in zip(workers_dict, workers_properties_dict):
        worker_dict = {
            "id": worker["_id"],
            "workerProperties": worker_properties_to_api(worker_properties),
        }
        workers_response.append(worker_dict)
    response = jsonify(workers_response)
    return response, 200


@worker_routes.route("/update-worker-property", methods=["POST"])
def edit_worker_property():
    input_received = request.get_json()
    worker_id = input_received["workerId"]
    worker_param_id = input_received["workerDimensionId"]
    value = input_received["value"]
    try:
        worker = worker_db.get_worker_by_id(worker_id)
        worker_param = worker_param_db.get_worker_param_by_id(worker_param_id)
        worker_property = worker_property_db.get_worker_property_by_worker_and_param(
            worker, worker_param
        )
        if not worker_property:
            updated_worker_property = worker_property_db.create_worker_property(
                worker, worker_param, value
            )
        else:
            updated_worker_property = worker_property_db.update_worker_property(
                worker_property, value
            )
        updated_worker_property_dict = updated_worker_property.to_dict()
        updated_worker_property_dict_api = worker_properties_to_api(
            [updated_worker_property_dict]
        )[0]
        response = jsonify(updated_worker_property_dict_api)
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@worker_routes.route("/delete-worker", methods=["DELETE"])
def delete_worker():
    worker_id_received = request.get_json()
    try:
        worker = worker_db.get_worker_by_id(worker_id_received["id"])
        worker_properties = worker_property_db.get_worker_properties_by_worker(worker)
        worker_property_db.delete_worker_properties(worker_properties)
        worker_db.delete_worker(worker)
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


def worker_properties_to_api(worker_properties: List) -> List:
    worker_properties_api = []
    for worker_property in worker_properties:
        worker_property_api = {
            "id": worker_property["_id"],
            "value": worker_property["value"],
            "workerId": worker_property["worker"],
            "workerDimensionId": worker_property["worker_param"],
        }
        worker_properties_api.append(worker_property_api)
    return worker_properties_api
