from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.worker import Worker, WorkerProperty
from routes.api_model import WorkerMessage, WorkerPropertyMessage
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db

router = APIRouter()


@router.post("/workers")
def create_worker() -> WorkerMessage:
    worker_created = worker_db.create_worker()
    wd_bool = worker_dimension_db.get_worker_dimensions_by_entry_type("bool")
    wp_bool = []
    for wd in wd_bool:
        wp_bool.append(
            worker_property_db.create_worker_property(worker_created, wd, False)
        )
    return worker_and_properties_to_api_msg(worker_created, wp_bool)


@router.get("/workers")
def get_workers() -> List[WorkerMessage]:
    workers = worker_db.get_workers()
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker(worker) for worker in workers
    ]
    return [
        worker_and_properties_to_api_msg(w, wp)
        for w, wp in zip(workers, workers_properties)
    ]


@router.put("/workers/{worker_id}")
def update_worker(worker_id: str, worker: WorkerMessage) -> WorkerMessage:
    existing_worker = worker_db.get_worker_by_id(worker_id)
    if not existing_worker:
        raise HTTPException(status_code=404, detail="Worker does not exist")
    worker_data = api_msg_to_worker(worker)
    updated_worker = worker_db.update_worker(worker_data)
    worker_properties = worker_property_db.get_worker_properties_by_worker(
        updated_worker
    )
    return worker_and_properties_to_api_msg(updated_worker, worker_properties)


@router.put("/workers/{worker_id}/properties/{worker_dimension_id}")
def update_worker_property(
    worker_id: str,
    worker_dimension_id: str,
    value: str = Body(...),
) -> WorkerPropertyMessage:
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
    return worker_property_to_api_msg(updated_worker_property)


@router.delete("/workers/{worker_id}")
def delete_worker(worker_id: str) -> Dict:
    worker_property_db.delete_worker_properties_by_worker_id(worker_id)
    worker_db.delete_worker(worker_id)
    return {"message": "Worker deleted"}


def worker_property_to_api_msg(
    worker_property: WorkerProperty,
) -> WorkerPropertyMessage:
    data = asdict(worker_property)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerPropertyMessage)
    return validator.validate_python(as_dict)


def worker_and_properties_to_api_msg(
    worker: Worker, worker_properties: List[WorkerProperty]
) -> WorkerMessage:
    data = asdict(worker)
    data["worker_properties"] = [
        worker_property_to_api_msg(wp) for wp in worker_properties
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerMessage)
    return validator.validate_python(as_dict)


def api_msg_to_worker(msg: WorkerMessage) -> Worker:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "worker_properties"}
    return Worker(**data_snake)
