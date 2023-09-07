from flask import Blueprint, jsonify, request
from scripts.setup_database import worker_param_db, worker_property_db

worker_param_routes = Blueprint("worker_params_routes", __name__)


@worker_param_routes.route("/create-worker-param", methods=["POST"])
def create_worker_param():
    new_worker_param = request.get_json()
    if (
        "label" in new_worker_param
        and "entry_type" in new_worker_param
        and "entry_options" in new_worker_param
    ):
        label = new_worker_param["label"]
        entry_type = new_worker_param["entry_type"]
        entry_options = new_worker_param["entry_options"]
        name = label.lower().replace(" ", "_")
    worker_params = worker_param_db.create_worker_param(
        name, label, entry_type, entry_options
    )
    worker_params_dict = [worker_param.to_dict() for worker_param in worker_params]
    response = jsonify({"worker_params": worker_params_dict})
    return response, 200


@worker_param_routes.route("/get-worker-params", methods=["GET"])
def get_worker_params():
    worker_params = worker_param_db.get_worker_params()
    if not worker_params:
        worker_params = worker_param_db.create_default_worker_params()
    worker_params_dict = [worker_param.to_dict() for worker_param in worker_params]
    print("worker_params_dict:", worker_params_dict)
    response = jsonify({"worker_params": worker_params_dict})
    return response, 200


@worker_param_routes.route("/update-worker-param", methods=["POST"])
def update_worker_param():
    info_received = request.get_json()
    worker_param_id = info_received["worker_param_id"]
    label = info_received["label"]
    entry_type = info_received["entry_type"]
    entry_options = info_received["entry_options"]
    try:
        worker_param = worker_param_db.get_worker_param_by_id(worker_param_id)
        worker_param_updated = worker_param_db.update_worker_param(
            worker_param, label, entry_type, entry_options
        )
        worker_param_updated_dict = worker_param_updated.to_dict()
        response = jsonify({"worker_param": worker_param_updated_dict})
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": "Worker param not found"}), 404


@worker_param_routes.route("/delete-worker-param", methods=["DELETE"])
def delete_worker_param():
    info_received = request.get_json()
    try:
        worker_param = worker_param_db.get_worker_param_by_id(
            info_received["worker_param_id"]
        )
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
