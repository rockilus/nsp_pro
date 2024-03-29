from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.worker import Worker, WorkerProperty
from errors import WorkerNameNotAllowed, handle_authz_errors
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import WorkerMessage, WorkerPropertyMessage
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.worker_services import add_back_worker_property_to_constraint_build
from services.worker_services import delete_worker as delete_worker_service

router = APIRouter()


@router.post("/workers/teams/{team_id}")
async def create_worker(
    team_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-worker", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to create a worker",
            )
    except Exception as e:
        handle_authz_errors(e)
    w_data = msg_to_core_worker(worker)
    worker_created = worker_db.create_worker(w_data)
    wd_bool = worker_dimension_db.get_worker_dimensions_by_entry_type("bool", team_id)
    wp_bool = []
    for wd in wd_bool:
        wp_bool.append(
            worker_property_db.create_worker_property(
                WorkerProperty(
                    id="",
                    value=False,
                    worker_id=worker_created.id,
                    worker_dimension_id=wd.id,
                )
            )
        )
    return core_to_msg_worker_and_properties(worker_created, wp_bool)


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerMessage]:
    if not await authz_check(session.get_user_id(), "read-workers", "team", team_id):
        raise HTTPException(
            status_code=403, detail="You do not have permission to get workers"
        )
    workers = worker_db.get_workers(team_id)
    workers_properties = [
        worker_property_db.get_worker_properties_by_worker_id(worker.id)
        for worker in workers
    ]
    return [
        core_to_msg_worker_and_properties(w, wp)
        for w, wp in zip(workers, workers_properties)
    ]


@router.put("/workers/{worker_id}/teams/{team_id}")
async def update_worker(
    team_id: str,
    worker_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerMessage:
    if not await authz_check(session.get_user_id(), "update-worker", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a worker",
        )
    existing_worker = worker_db.get_worker_by_id(worker_id)
    if not existing_worker:
        raise HTTPException(status_code=404, detail="Worker does not exist")
    w_data = msg_to_core_worker(worker)
    try:
        if w_data.name == "Trump":
            raise WorkerNameNotAllowed(f"Worker name {w_data.name} is not allowed")
    except WorkerNameNotAllowed as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    updated_worker = worker_db.update_worker(w_data)
    worker_properties = worker_property_db.get_worker_properties_by_worker_id(
        updated_worker.id
    )
    return core_to_msg_worker_and_properties(updated_worker, worker_properties)


@router.put("/workers/{worker_id}/properties/{worker_dimension_id}/teams/{team_id}")
async def update_worker_property(
    team_id: str,
    worker_property: WorkerPropertyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerPropertyMessage:
    if not await authz_check(
        session.get_user_id(), "update-worker-property", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a worker property",
        )
    wp_data = msg_to_core_worker_property(worker_property)
    if wp_data.id == "":
        new_wp = worker_property_db.create_worker_property(wp_data)
    else:
        new_wp = worker_property_db.update_worker_property(wp_data)
    add_back_worker_property_to_constraint_build(new_wp)
    return core_to_msg_worker_property(new_wp)


@router.delete("/workers/{worker_id}/teams/{team_id}")
async def delete_worker(
    worker_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await authz_check(session.get_user_id(), "delete-worker", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a worker",
        )
    delete_worker_service(worker_id)
    return {"message": "Worker deleted"}


# Mappers
# core to message
def core_to_msg_worker_property(
    worker_property: WorkerProperty,
) -> WorkerPropertyMessage:
    data = asdict(worker_property)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerPropertyMessage)
    return validator.validate_python(as_dict)


def core_to_msg_worker_and_properties(
    worker: Worker, worker_properties: List[WorkerProperty]
) -> WorkerMessage:
    data = asdict(worker)
    data["worker_properties"] = [
        core_to_msg_worker_property(wp) for wp in worker_properties
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerMessage)
    return validator.validate_python(as_dict)


# message to core
def msg_to_core_worker(msg: WorkerMessage) -> Worker:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "worker_properties"}
    return Worker(**data_snake)


def msg_to_core_worker_property(msg: WorkerPropertyMessage) -> WorkerProperty:
    data_snake = humps.decamelize(msg.model_dump())
    return WorkerProperty(**data_snake)
