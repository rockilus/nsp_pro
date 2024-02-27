from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.worker import Worker, WorkerProperty
from routes.api_model import WorkerMessage, WorkerPropertyMessage
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check
from services.deletion_services.delete_worker import (
    add_back_worker_property_to_constraint_build,
)
from services.deletion_services.delete_worker import (
    delete_worker as delete_worker_service,
)

router = APIRouter()


@router.post("/workers/teams/{team_id}")
async def create_worker(
    team_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerMessage:
    if not await permit_check(session.get_user_id(), "create-worker", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a worker",
        )
    w_data = api_msg_to_worker(worker)
    worker_created = worker_db.create_worker(w_data)
    wd_bool = worker_dimension_db.get_worker_dimensions_by_entry_type("bool")
    wp_bool = []
    for wd in wd_bool:
        wp_bool.append(
            worker_property_db.create_worker_property(worker_created, wd, False)
        )
    return worker_and_properties_to_api_msg(worker_created, wp_bool)


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerMessage]:
    if not await permit_check(session.get_user_id(), "read-workers", "team", team_id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to get workers"
        )
    workers = worker_db.get_workers()
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker_id(worker.id)
        for worker in workers
    ]
    return [
        worker_and_properties_to_api_msg(w, wp)
        for w, wp in zip(workers, workers_properties)
    ]


@router.put("/workers/{worker_id}/teams/{team_id}")
async def update_worker(
    team_id: str,
    worker_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerMessage:
    if not await permit_check(session.get_user_id(), "update-worker", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a worker",
        )
    existing_worker = worker_db.get_worker_by_id(worker_id)
    if not existing_worker:
        raise HTTPException(status_code=404, detail="Worker does not exist")
    w_data = api_msg_to_worker(worker)
    updated_worker = worker_db.update_worker(w_data)
    worker_properties = worker_property_db.get_worker_properties_by_worker_id(
        updated_worker.id
    )
    return worker_and_properties_to_api_msg(updated_worker, worker_properties)


@router.put("/workers/{worker_id}/properties/{worker_dimension_id}/teams/{team_id}")
async def update_worker_property(
    team_id: str,
    worker_id: str,
    worker_dimension_id: str,
    worker_property: WorkerPropertyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerPropertyMessage:
    if not await permit_check(
        session.get_user_id(), "update-worker-property", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a worker property",
        )
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


@router.delete("/workers/{worker_id}/teams/{team_id}")
async def delete_worker(
    worker_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await permit_check(session.get_user_id(), "delete-worker", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a worker",
        )
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
