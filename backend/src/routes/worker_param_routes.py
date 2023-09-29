from typing import List

from flask import Blueprint, jsonify, request
from scripts.setup_database import worker_param_db, worker_property_db

worker_param_routes = Blueprint("worker_params_routes", __name__)


@worker_param_routes.route("/create-worker-param", methods=["POST"])
def create_worker_param():
    new_worker_param = request.get_json()
    if (
        "label" in new_worker_param
        and "entryType" in new_worker_param
        and "entryOptions" in new_worker_param
    ):
        label = new_worker_param["label"]
        entry_type = new_worker_param["entryType"]
        entry_options = new_worker_param["entryOptions"]
        name = label.lower().replace(" ", "_")
    worker_param = worker_param_db.create_worker_param(
        name, label, entry_type, entry_options
    )
    worker_param_dict = worker_param.to_dict()
    worker_param_dict_api = worker_param_to_api([worker_param_dict])[0]
    response = jsonify(worker_param_dict_api)
    return response, 200


@worker_param_routes.route("/get-worker-params", methods=["GET"])
def get_worker_params():
    worker_params = worker_param_db.get_worker_params()
    if not worker_params:
        worker_params = worker_param_db.create_default_worker_params()
    worker_params_dict = [worker_param.to_dict() for worker_param in worker_params]
    worker_params_dict_api = worker_param_to_api(worker_params_dict)
    response = jsonify(worker_params_dict_api)
    return response, 200


@worker_param_routes.route("/update-worker-param", methods=["POST"])
def update_worker_param():
    info_received = request.get_json()
    # pylint: disable=R0801
    worker_param_id = info_received["id"]
    label = info_received["label"]
    entry_type = info_received["entryType"]
    entry_options = info_received["entryOptions"]
    name = label.lower().replace(" ", "_")
    try:
        worker_param = worker_param_db.get_worker_param_by_id(worker_param_id)
        worker_param_updated = worker_param_db.update_worker_param(
            worker_param, label, name, entry_type, entry_options
        )
        worker_param_updated_dict = worker_param_updated.to_dict()
        worker_param_updated_dict_api = worker_param_to_api(
            [worker_param_updated_dict]
        )[0]
        response = jsonify(worker_param_updated_dict_api)
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": "Worker param not found"}), 404


@worker_param_routes.route("/delete-worker-param", methods=["DELETE"])
def delete_worker_param():
    info_received = request.get_json()
    try:
        worker_param = worker_param_db.get_worker_param_by_id(info_received["id"])
        worker_properties = worker_property_db.get_worker_properties_by_worker_param(
            worker_param
        )
        worker_property_db.delete_worker_properties(worker_properties)
        worker_param_db.delete_worker_param(worker_param)
        return jsonify({"message": "Worker deleted"}), 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


def worker_param_to_api(worker_params: List) -> List:
    worker_params_api = []
    for worker_param in worker_params:
        worker_param_api = {
            "id": worker_param["_id"],
            "name": worker_param["name"],
            "label": worker_param["label"],
            "entryType": worker_param["entry_type"],
            "entryOptions": worker_param["entry_options"],
        }
        worker_params_api.append(worker_param_api)
    return worker_params_api
