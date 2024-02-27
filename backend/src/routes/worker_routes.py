from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session

from core.worker import Worker, WorkerProperty
from routes.api_model import WorkerMessage, WorkerPropertyMessage
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.deletion_services.delete_worker import (
    add_back_worker_property_to_constraint_build,
)
from services.deletion_services.delete_worker import (
    delete_worker as delete_worker_service,
)

router = APIRouter()


@router.post("/workers")
def create_worker(
    session: SessionContainer = Depends(verify_session()),
) -> WorkerMessage:
    print("session", session.get_user_id())
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
        worker_property_db.get_worker_properties_by_worker_id(worker.id)
        for worker in workers
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
    worker_properties = worker_property_db.get_worker_properties_by_worker_id(
        updated_worker.id
    )
    return worker_and_properties_to_api_msg(updated_worker, worker_properties)


@router.put("/workers/{worker_id}/properties/{worker_dimension_id}")
def update_worker_property(
    worker_id: str,
    worker_dimension_id: str,
    worker_property: WorkerPropertyMessage,
) -> WorkerPropertyMessage:
    wp_data = api_msg_to_worker_property(worker_property)
    if wp_data.id == "":
        worker = worker_db.get_worker_by_id(worker_id)
        worker_dimension = worker_dimension_db.get_worker_dimension_by_id(
            worker_dimension_id
        )
        new_wp = worker_property_db.create_worker_property(
            worker, worker_dimension, wp_data.value
        )
    else:
        new_wp = worker_property_db.update_worker_property(wp_data)
    add_back_worker_property_to_constraint_build(new_wp)
    return worker_property_to_api_msg(new_wp)


@router.delete("/workers/{worker_id}")
def delete_worker(worker_id: str) -> Dict:
    delete_worker_service(worker_id)
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


def api_msg_to_worker_property(msg: WorkerPropertyMessage) -> WorkerProperty:
    data_snake = humps.decamelize(msg.model_dump())
    return WorkerProperty(**data_snake)
