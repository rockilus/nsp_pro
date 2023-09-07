from flask import Blueprint, jsonify, request
from scripts.setup_database import shift_param_db, shift_property_db

shift_param_routes = Blueprint("shift_params_routes", __name__)


@shift_param_routes.route("/create-shift-param", methods=["POST"])
def create_shift_param():
    new_shift_param = request.get_json()
    if (
        "label" in new_shift_param
        and "entry_type" in new_shift_param
        and "entry_options" in new_shift_param
    ):
        label = new_shift_param["label"]
        entry_type = new_shift_param["entry_type"]
        entry_options = new_shift_param["entry_options"]
        name = label.lower().replace(" ", "_")
    shift_params = shift_param_db.create_shift_param(
        name, label, entry_type, entry_options
    )
    shift_params_dict = [shift_param.to_dict() for shift_param in shift_params]
    response = jsonify({"shift_params": shift_params_dict})
    return response, 200


@shift_param_routes.route("/get-shift-params", methods=["GET"])
def get_shift_params():
    shift_params = shift_param_db.get_shift_params()
    if not shift_params:
        shift_params = shift_param_db.create_default_shift_params()
    shift_params_dict = [shift_param.to_dict() for shift_param in shift_params]
    print("shift_params_dict:", shift_params_dict)
    response = jsonify({"shift_params": shift_params_dict})
    return response, 200


@shift_param_routes.route("/update-shift-param", methods=["POST"])
def update_shift_param():
    info_received = request.get_json()
    shift_param_id = info_received["shift_param_id"]
    label = info_received["label"]
    entry_type = info_received["entry_type"]
    entry_options = info_received["entry_options"]
    try:
        shift_param = shift_param_db.get_shift_param_by_id(shift_param_id)
        shift_param_updated = shift_param_db.update_shift_param(
            shift_param, label, entry_type, entry_options
        )
        shift_param_updated_dict = shift_param_updated.to_dict()
        response = jsonify({"shift_param": shift_param_updated_dict})
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": "shift param not found"}), 404


@shift_param_routes.route("/delete-shift-param", methods=["DELETE"])
def delete_shift_param():
    info_received = request.get_json()
    try:
        shift_param = shift_param_db.get_shift_param_by_id(
            info_received["shift_param_id"]
        )
        shift_properties = shift_property_db.get_shift_properties_by_shift_param(
            shift_param
        )
        shift_property_db.delete_shift_properties(shift_properties)
        shift_param_db.delete_shift_param(shift_param)
        return jsonify({"message": "shift deleted"}), 200
    # pylint: disable=broad-except
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404
