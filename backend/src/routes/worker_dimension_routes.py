from dataclasses import asdict
from typing import Dict

import humps
from flask import Blueprint, jsonify, request
from core.worker import WorkerDimension
from scripts.setup_database import worker_dimension_db, worker_property_db

worker_dimension_routes = Blueprint("worker_dimension_routes", __name__)


@worker_dimension_routes.route("/create-worker-dimension", methods=["POST"])
def create_worker_dimension():
    new_worker_dimension = request.get_json()
    if (
        "label" in new_worker_dimension
        and "entryType" in new_worker_dimension
        and "entryOptions" in new_worker_dimension
    ):
        label = new_worker_dimension["label"]
        entry_type = new_worker_dimension["entryType"]
        entry_options = new_worker_dimension["entryOptions"]
        name = label.lower().replace(" ", "_")
    worker_dimension = worker_dimension_db.create_worker_dimension(
        name, label, entry_type, entry_options
    )
    response = jsonify(dataclass_to_dict(worker_dimension))
    return response, 200


@worker_dimension_routes.route("/get-worker-dimensions", methods=["GET"])
def get_worker_dimensions():
    worker_dimensions = worker_dimension_db.get_worker_dimensions()
    if not worker_dimensions:
        worker_dimensions = worker_dimension_db.create_default_worker_dimensions()
    response = jsonify([dataclass_to_dict(wd) for wd in worker_dimensions])
    return response, 200


@worker_dimension_routes.route("/update-worker-dimension", methods=["POST"])
def update_worker_dimension():
    info_received = request.get_json()
    worker_dimension = dict_to_worker_dimension(info_received)
    worker_dimension.name = worker_dimension.label.lower().replace(" ", "_")
    worker_dimension_updated = worker_dimension_db.update_worker_dimension(
        worker_dimension
    )
    response = jsonify(dataclass_to_dict(worker_dimension_updated))
    return response, 200


@worker_dimension_routes.route("/delete-worker-dimension", methods=["DELETE"])
def delete_worker_dimension():
    info_received = request.get_json()
    worker_property_db.delete_worker_properties_by_worker_dimension_id(
        info_received["id"]
    )
    worker_dimension_db.delete_worker_dimension(info_received["id"])
    return jsonify({"message": "Worker deleted"}), 200


def dataclass_to_dict(obj: WorkerDimension) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_worker_dimension(data: dict) -> WorkerDimension:
    data_snake = humps.decamelize(data)
    return WorkerDimension(**data_snake)
