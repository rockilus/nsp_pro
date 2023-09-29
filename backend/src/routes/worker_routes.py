from dataclasses import asdict
from typing import Dict, Union

import humps
from flask import Blueprint, jsonify, request
from core.worker import Worker, WorkerProperty
from scripts.setup_database import (
    worker_db,
    worker_dimension_db,
    worker_property_db,
)

worker_routes = Blueprint("worker_routes", __name__)


@worker_routes.route("/create-worker", methods=["POST"])
def create_worker():
    worker_created = worker_db.create_worker()
    worker_properties = worker_property_db.get_worker_properties_by_worker(
        worker_created
    )
    worker_response = {
        "id": worker_created.id,
        "workerProperties": [dataclass_to_dict(wp) for wp in worker_properties],
    }
    response = jsonify(worker_response)
    return response, 200


@worker_routes.route("/get-workers", methods=["GET"])
def get_workers():
    workers = worker_db.get_workers()
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker(worker) for worker in workers
    ]
    workers_response = []
    for worker, worker_properties in zip(workers, workers_properties):
        worker_dict = {
            "id": worker.id,
            "workerProperties": [dataclass_to_dict(wp) for wp in worker_properties],
        }
        workers_response.append(worker_dict)
    response = jsonify(workers_response)
    return response, 200


@worker_routes.route("/update-worker-property", methods=["POST"])
def edit_worker_property():
    input_received = request.get_json()
    worker_id = input_received["workerId"]
    worker_dimension_id = input_received["workerDimensionId"]
    value = input_received["value"]
    worker = worker_db.get_worker_by_id(worker_id)
    worker_dimension = worker_dimension_db.get_worker_dimension_by_id(
        worker_dimension_id
    )
    worker_property = worker_property_db.get_worker_property_by_worker_and_dimension(
        worker, worker_dimension
    )
    if not worker_property:
        updated_worker_property = worker_property_db.create_worker_property(
            worker, worker_dimension, value
        )
    else:
        worker_property.value = value
        updated_worker_property = worker_property_db.update_worker_property(
            worker_property
        )
    response = jsonify(dataclass_to_dict(updated_worker_property))
    return response, 200


@worker_routes.route("/delete-worker", methods=["DELETE"])
def delete_worker():
    worker_id_received = request.get_json()
    worker_property_db.delete_worker_properties_by_worker_id(worker_id_received["id"])
    worker_db.delete_worker(worker_id_received["id"])
    return jsonify({"message": "Worker deleted"}), 200


def dataclass_to_dict(obj: Union[Worker, WorkerProperty]) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_worker_property(data: dict) -> WorkerProperty:
    data_snake = humps.decamelize(data)
    return WorkerProperty(**data_snake)
