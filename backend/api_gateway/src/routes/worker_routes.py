import time as time_module
from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Attribute, Worker
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_worker_service
from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import WorkerMessage
from src.routes.attribute_routes import core_to_msg_attribute
from src.services.worker_service import WorkerService

router = APIRouter()


@router.post("/workers/teams/{team_id}")
async def create_worker(
    team_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a worker")
        w_data = msg_to_core_worker(worker)
        worker_created, a_bool = worker_service.create_worker(w_data)
        response = core_to_msg_worker_and_attributes(worker_created, a_bool)
    except Exception as e:
        log_info("Failed to create worker")
        handle_routes_errors(e)
    return response


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-workers", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get workers")
        workers = db_collections.worker_db.get_workers_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(worker.id)
            for worker in workers
        ]
        response = [
            core_to_msg_worker_and_attributes(w, wp)
            for w, wp in zip(workers, attributes)
        ]
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.get("/workers/all/teams/{team_id}")
async def get_all_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-workers", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get workers")
        start_time = time_module.time()
        workers = db_collections.worker_db.get_workers(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(worker.id)
            for worker in workers
        ]
        response = [
            core_to_msg_worker_and_attributes(w, wp)
            for w, wp in zip(workers, attributes)
        ]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get workers: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.put("/workers/{worker_id}/teams/{team_id}")
async def update_worker(
    team_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a worker")
        w_data = msg_to_core_worker(worker)
        updated_worker = worker_service.update_worker(w_data)
        attributes = db_collections.attribute_db.get_attributes_by_owner_id(
            updated_worker.id
        )
        response = core_to_msg_worker_and_attributes(updated_worker, attributes)
    except Exception as e:
        log_info("Failed to update worker")
        handle_routes_errors(e)
    return response


@router.delete("/workers/{worker_id}/teams/{team_id}")
async def delete_worker(
    worker_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    worker_service: WorkerService = Depends(get_worker_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete a worker")
        worker_service.delete_worker(worker_id)
    except Exception as e:
        log_info("Failed to delete worker")
        handle_routes_errors(e)
    return {"message": "Worker deleted"}


# Mappers
# core to message
def core_to_msg_worker_and_attributes(
    worker: Worker, attributes: List[Attribute]
) -> WorkerMessage:
    try:
        data = asdict(worker)
    except Exception as e:
        log_info("Failed to convert Worker to dictionary")
        raise MessageTypeError(str(e)) from e
    data["employment_start_date"] = datetime.combine(
        worker.employment_start_date, time.min, tzinfo=timezone.utc
    ).timestamp()
    data["employment_end_date"] = (
        datetime.combine(worker.employment_end_date, time.min, timezone.utc).timestamp()
        if worker.employment_end_date
        else None
    )
    data["attributes"] = [core_to_msg_attribute(a) for a in attributes]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerMessage)
    try:
        w_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Worker to WorkerMessage")
        handle_message_errors(e)
    return w_msg


# message to core
def msg_to_core_worker(msg: WorkerMessage) -> Worker:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "attributes"}
    data_snake["employment_start_date"] = datetime.fromtimestamp(
        data_snake["employment_start_date"], timezone.utc
    ).date()
    data_snake["employment_end_date"] = (
        datetime.fromtimestamp(data_snake["employment_end_date"], timezone.utc).date()
        if data_snake["employment_end_date"]
        else None
    )
    try:
        worker = Worker(**data_snake)
    except Exception as e:
        log_info("Failed to convert WorkerMessage to Worker")
        handle_create_schema_object_error(e)
    return worker
