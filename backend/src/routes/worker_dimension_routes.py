from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body, HTTPException
from pydantic import TypeAdapter

from core.worker import WorkerDimension
from routes.api_model import WorkerDimensionMessage
from scripts.setup_database import worker_dimension_db, worker_property_db

router = APIRouter()


@router.post("/worker-dimensions")
def create_worker_dimension(
    name: str = Body(...),
    entry_type: str = Body(..., alias="entryType"),
    entry_options: List[str] = Body(..., alias="entryOptions"),
) -> WorkerDimensionMessage:
    worker_dimension = worker_dimension_db.create_worker_dimension(
        name, entry_type, entry_options
    )
    return worker_dimension_to_api_msg(worker_dimension)


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
        raise HTTPException(status_code=404, detail="Worker Dimension does not exist")
    worker_dimension_data = api_msg_to_worker_dimension(worker_dimension)
    worker_dimension_updated = worker_dimension_db.update_worker_dimension(
        worker_dimension_data
    )
    return worker_dimension_to_api_msg(worker_dimension_updated)


@router.delete("/worker-dimensions/{worker_dimension_id}")
def delete_worker_dimension(worker_dimension_id: str) -> Dict:
    worker_property_db.delete_worker_properties_by_worker_dimension_id(
        worker_dimension_id
    )
    worker_dimension_db.delete_worker_dimension(worker_dimension_id)
    return {"message": "Worker deleted"}


def worker_dimension_to_api_msg(
    worker_dimension: WorkerDimension,
) -> WorkerDimensionMessage:
    data = asdict(worker_dimension)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerDimensionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_worker_dimension(
    msg: WorkerDimensionMessage,
) -> WorkerDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return WorkerDimension(**data_snake)
