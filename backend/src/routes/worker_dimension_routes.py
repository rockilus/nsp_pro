from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.worker import WorkerDimension, WorkerProperty
from routes.api_model import NewWorkerDimensionMessage, WorkerDimensionMessage
from routes.worker_routes import worker_property_to_api_msg
from scripts.setup_database import (
    worker_db,
    worker_dimension_db,
    worker_property_db,
)
from services.deletion_services.delete_worker_dimension import (
    delete_worker_dimension as delete_worker_dimension_service,
)

router = APIRouter()


@router.post("/worker-dimensions")
def create_worker_dimension(
    name: str = Body(...),
    entry_type: str = Body(..., alias="entryType"),
    entry_options: List[str] = Body(..., alias="entryOptions"),
) -> NewWorkerDimensionMessage:
    worker_dimension = worker_dimension_db.create_worker_dimension(
        name, entry_type, entry_options
    )
    properties = []
    if entry_type == "bool":
        workers = worker_db.get_workers()
        for worker in workers:
            properties.append(
                worker_property_db.create_worker_property(
                    worker, worker_dimension, False
                )
            )
    return new_worker_dimension_to_api_msg(worker_dimension, properties)


@router.get("/worker-dimensions")
def get_worker_dimensions() -> List[WorkerDimensionMessage]:
    worker_dimensions = worker_dimension_db.get_worker_dimensions()
    return [worker_dimension_to_api_msg(wd) for wd in worker_dimensions]


@router.put("/worker-dimensions/{worker_dimension_id}")
def update_worker_dimension(
    worker_dimension_id: str,
    worker_dimension: WorkerDimensionMessage,  # pylint: disable=W0613
) -> WorkerDimensionMessage:
    existing_worker_dim = worker_dimension_db.get_worker_dimension_by_id(
        worker_dimension_id
    )
    if not existing_worker_dim:
        raise HTTPException(
            status_code=404, detail="Worker Dimension does not exist"
        )
    worker_dimension_data = api_msg_to_worker_dimension(worker_dimension)
    worker_dimension_updated = worker_dimension_db.update_worker_dimension(
        worker_dimension_data
    )
    return worker_dimension_to_api_msg(worker_dimension_updated)


@router.delete("/worker-dimensions/{worker_dimension_id}")
def delete_worker_dimension(worker_dimension_id: str) -> Dict:
    delete_worker_dimension_service(worker_dimension_id)
    return {"message": "Worker deleted"}


def worker_dimension_to_api_msg(
    worker_dimension: WorkerDimension,
) -> WorkerDimensionMessage:
    data = asdict(worker_dimension)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerDimensionMessage)
    return validator.validate_python(as_dict)


def new_worker_dimension_to_api_msg(
    worker_dimension: WorkerDimension,
    worker_properties: List[WorkerProperty],
) -> NewWorkerDimensionMessage:
    as_dict = {
        "newDimension": worker_dimension_to_api_msg(worker_dimension),
        "newProperties": [
            worker_property_to_api_msg(wp) for wp in worker_properties
        ],
    }
    validator = TypeAdapter(NewWorkerDimensionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_worker_dimension(
    msg: WorkerDimensionMessage,
) -> WorkerDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return WorkerDimension(**data_snake)
