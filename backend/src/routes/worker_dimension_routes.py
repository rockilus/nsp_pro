from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Body

from core.worker import WorkerDimension
from scripts.setup_database import worker_dimension_db, worker_property_db

router = APIRouter()


@router.post("/create-worker-dimension")
def create_worker_dimension(
    name: str = Body(...),
    entry_type: str = Body(..., alias="entryType"),
    entry_options: List[str] = Body(..., alias="entryOptions"),
) -> Dict:
    worker_dimension = worker_dimension_db.create_worker_dimension(
        name, entry_type, entry_options
    )
    return dataclass_to_dict(worker_dimension)


@router.get("/get-worker-dimensions", response_model=List[Dict])
def get_worker_dimensions() -> List[Dict]:
    worker_dimensions = worker_dimension_db.get_worker_dimensions()
    if not worker_dimensions:
        worker_dimensions = worker_dimension_db.create_default_worker_dimensions()
    return [dataclass_to_dict(wd) for wd in worker_dimensions]


@router.post("/update-worker-dimension")
def update_worker_dimension(worker_dimension: WorkerDimension) -> Dict:
    worker_dimension_updated = worker_dimension_db.update_worker_dimension(
        worker_dimension
    )
    return dataclass_to_dict(worker_dimension_updated)


@router.delete("/delete-worker-dimension")
def delete_worker_dimension(worker_dimension_id: str) -> Dict:
    worker_property_db.delete_worker_properties_by_worker_dimension_id(
        worker_dimension_id
    )
    worker_dimension_db.delete_worker_dimension(worker_dimension_id)
    return {"message": "Worker deleted"}


def dataclass_to_dict(obj: WorkerDimension) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_worker_dimension(data: dict) -> WorkerDimension:
    data_snake = humps.decamelize(data)
    return WorkerDimension(**data_snake)
