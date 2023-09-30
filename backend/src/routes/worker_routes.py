from dataclasses import asdict
from typing import Dict, List, Union

import humps
from fastapi import APIRouter, Body

from core.worker import Worker, WorkerProperty
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db

router = APIRouter()


@router.post("/create-worker")
def create_worker() -> Dict:
    worker_created = worker_db.create_worker()
    worker_properties = worker_property_db.get_worker_properties_by_worker(
        worker_created
    )
    return {
        "id": worker_created.id,
        "workerProperties": [dataclass_to_dict(wp) for wp in worker_properties],
    }


@router.get("/get-workers", response_model=List[Dict])
def get_workers() -> List[Dict]:
    workers = worker_db.get_workers()
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker(worker) for worker in workers
    ]
    return [
        {
            "id": worker.id,
            "workerProperties": [dataclass_to_dict(wp) for wp in worker_properties],
        }
        for worker, worker_properties in zip(workers, workers_properties)
    ]


@router.post("/update-worker-property")
def edit_worker_property(
    worker_id: str = Body(..., alias="workerId"),
    worker_dimension_id: str = Body(..., alias="workerDimensionId"),
    value: str = Body(...),
) -> Dict:
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
    return dataclass_to_dict(updated_worker_property)


@router.delete("/delete-worker")
def delete_worker(worker_id: str = Body(..., embed=True)) -> Dict:
    worker_property_db.delete_worker_properties_by_worker_id(worker_id)
    worker_db.delete_worker(worker_id)
    return {"message": "Worker deleted"}


def dataclass_to_dict(obj: Union[Worker, WorkerProperty]) -> Dict:
    data = asdict(obj)
    return humps.camelize(data)


def dict_to_worker_property(data: dict) -> WorkerProperty:
    data_snake = humps.decamelize(data)
    return WorkerProperty(**data_snake)
