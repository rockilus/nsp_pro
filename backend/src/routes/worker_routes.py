from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Worker, WorkerProperty
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import WorkerMessage, WorkerPropertyMessage
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.worker_services import create_or_update_worker_property
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
            raise NotAuthorizedError("You do not have permission to create a worker")
        w_data = msg_to_core_worker(worker)
        worker_created = worker_db.create_worker(w_data)
        wd_bool = worker_dimension_db.get_worker_dimensions_by_entry_type(
            "bool", team_id
        )
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
        response = core_to_msg_worker_and_properties(worker_created, wp_bool)
    except Exception as e:
        log_info("Failed to create worker")
        handle_routes_errors(e)
    return response


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-workers", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get workers")
        workers = worker_db.get_workers_not_deleted(team_id)
        workers_properties = [
            worker_property_db.get_worker_properties_by_worker_id(worker.id)
            for worker in workers
        ]
        response = [
            core_to_msg_worker_and_properties(w, wp)
            for w, wp in zip(workers, workers_properties)
        ]
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.get("/workers/all/teams/{team_id}")
async def get_all_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-workers", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get workers")
        workers = worker_db.get_workers(team_id)
        workers_properties = [
            worker_property_db.get_worker_properties_by_worker_id(worker.id)
            for worker in workers
        ]
        response = [
            core_to_msg_worker_and_properties(w, wp)
            for w, wp in zip(workers, workers_properties)
        ]
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.put("/workers/{worker_id}/teams/{team_id}")
async def update_worker(
    team_id: str,
    worker: WorkerMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a worker")
        w_data = msg_to_core_worker(worker)
        updated_worker = worker_db.update_worker(w_data)
        worker_properties = worker_property_db.get_worker_properties_by_worker_id(
            updated_worker.id
        )
        response = core_to_msg_worker_and_properties(updated_worker, worker_properties)
    except Exception as e:
        log_info("Failed to update worker")
        handle_routes_errors(e)
    return response


@router.put("/workers/{worker_id}/properties/{worker_dimension_id}/teams/{team_id}")
async def update_worker_property(
    team_id: str,
    worker_property: WorkerPropertyMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerPropertyMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-worker-property", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a worker property"
            )
        wp_data = msg_to_core_worker_property(worker_property)
        new_wp = create_or_update_worker_property(wp_data)
        response = core_to_msg_worker_property(new_wp)
    except Exception as e:
        log_info("Failed to update worker property")
        handle_routes_errors(e)
    return response


@router.delete("/workers/{worker_id}/teams/{team_id}")
async def delete_worker(
    worker_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete a worker")
        delete_worker_service(worker_id)
    except Exception as e:
        log_info("Failed to delete worker")
        handle_routes_errors(e)
    return {"message": "Worker deleted"}


# Mappers
# core to message
def core_to_msg_worker_property(
    worker_property: WorkerProperty,
) -> WorkerPropertyMessage:
    try:
        data = asdict(worker_property)
    except Exception as e:
        log_info("Failed to convert WorkerProperty to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerPropertyMessage)
    try:
        wp_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert WorkerProperty to WorkerPropertyMessage")
        handle_message_errors(e)
    return wp_msg


def core_to_msg_worker_and_properties(
    worker: Worker, worker_properties: List[WorkerProperty]
) -> WorkerMessage:
    try:
        data = asdict(worker)
    except Exception as e:
        log_info("Failed to convert Worker to dictionary")
        raise MessageTypeError(str(e)) from e
    data["worker_properties"] = [
        core_to_msg_worker_property(wp) for wp in worker_properties
    ]
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
    data_snake = {k: v for k, v in data_snake.items() if k != "worker_properties"}
    try:
        worker = Worker(**data_snake)
    except Exception as e:
        log_info("Failed to convert WorkerMessage to Worker")
        handle_create_core_object_error(e)
    return worker


def msg_to_core_worker_property(msg: WorkerPropertyMessage) -> WorkerProperty:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        worker_property = WorkerProperty(**data_snake)
    except Exception as e:
        log_info("Failed to convert WorkerPropertyMessage to WorkerProperty")
        handle_create_core_object_error(e)
    return worker_property
