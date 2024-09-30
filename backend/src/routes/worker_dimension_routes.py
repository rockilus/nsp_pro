from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import WorkerDimension, WorkerProperty
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
from routes.api_model import NewWorkerDimensionMessage, WorkerDimensionMessage
from routes.worker_routes import core_to_msg_worker_property
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.worker_services import (
    delete_worker_dimension as delete_worker_dimension_service,
)

router = APIRouter()


@router.post("/worker-dimensions/teams/{team_id}")
async def create_worker_dimension(
    team_id: str,
    worker_dimension: WorkerDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> NewWorkerDimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-worker-dimension", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a worker dimension"
            )
        wd_data = msg_to_core_worker_dimension(worker_dimension)
        wd_created = worker_dimension_db.create_worker_dimension(wd_data)
        properties = []
        if wd_created.entry_type == "bool":
            workers = worker_db.get_workers(team_id)
            # pylint: disable=R0801
            for worker in workers:
                properties.append(
                    worker_property_db.create_worker_property(
                        WorkerProperty(
                            id="",
                            value=False,
                            worker_id=worker.id,
                            worker_dimension_id=wd_created.id,
                        )
                    )
                )
        response = core_to_msg_new_worker_dimension(wd_created, properties)
    except Exception as e:
        log_info("Failed to create worker dimension")
        handle_routes_errors(e)
    return response


@router.get("/worker-dimensions/teams/{team_id}")
async def get_worker_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerDimensionMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-worker-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get worker dimensions"
            )
        worker_dimensions = worker_dimension_db.get_worker_dimensions_not_deleted(
            team_id
        )
        response = [core_to_msg_worker_dimension(wd) for wd in worker_dimensions]
    except Exception as e:
        log_info("Failed to get worker dimensions")
        handle_routes_errors(e)
    return response


@router.get("/worker-dimensions/all/teams/{team_id}")
async def get_all_worker_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerDimensionMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-worker-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get worker dimensions"
            )
        worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
        response = [core_to_msg_worker_dimension(wd) for wd in worker_dimensions]
    except Exception as e:
        log_info("Failed to get worker dimensions")
        handle_routes_errors(e)
    return response


@router.put("/worker-dimensions/{worker_dimension_id}/teams/{team_id}")
async def update_worker_dimension(
    team_id: str,
    worker_dimension: WorkerDimensionMessage,  # pylint: disable=W0613
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerDimensionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-worker-dimension", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a worker dimension"
            )
        worker_dimension_data = msg_to_core_worker_dimension(worker_dimension)
        worker_dimension_updated = worker_dimension_db.update_worker_dimension(
            worker_dimension_data
        )
        response = core_to_msg_worker_dimension(worker_dimension_updated)
    except Exception as e:
        log_info("Failed to update worker dimension")
        handle_routes_errors(e)
    return response


@router.delete("/worker-dimensions/{worker_dimension_id}/teams/{team_id}")
async def delete_worker_dimension(
    worker_dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-worker-dimension", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a worker dimension"
            )
        delete_worker_dimension_service(worker_dimension_id)
    except Exception as e:
        log_info("Failed to delete worker dimension")
        handle_routes_errors(e)
    return {"message": "Worker deleted"}


# Mappers
# core to message
def core_to_msg_worker_dimension(
    worker_dimension: WorkerDimension,
) -> WorkerDimensionMessage:
    try:
        data = asdict(worker_dimension)
    except Exception as e:
        log_info("Failed to convert WorkerDimension to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkerDimensionMessage)
    try:
        wd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert WorkerDimension to WorkerDimensionMessage")
        handle_message_errors(e)
    return wd_msg


def core_to_msg_new_worker_dimension(
    worker_dimension: WorkerDimension,
    worker_properties: List[WorkerProperty],
) -> NewWorkerDimensionMessage:
    try:
        as_dict = {
            "newDimension": core_to_msg_worker_dimension(worker_dimension),
            "newProperties": [
                core_to_msg_worker_property(wp) for wp in worker_properties
            ],
        }
    except Exception as e:
        log_info(
            "Failed to convert WorkerDimension and WorkerProperty list to dictionary"
        )
        raise MessageTypeError(str(e)) from e
    validator = TypeAdapter(NewWorkerDimensionMessage)
    try:
        nwd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info(
            "Failed to convert WorkerDimension and WorkerProperty list to "
            + "NewWorkerDimensionMessage"
        )
        handle_message_errors(e)
    return nwd_msg


# message to core
def msg_to_core_worker_dimension(
    msg: WorkerDimensionMessage,
) -> WorkerDimension:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        worker_dimension = WorkerDimension(**data_snake)
    except Exception as e:
        log_info("Failed to convert WorkerDimensionMessage to WorkerDimension")
        handle_create_core_object_error(e)
    return worker_dimension
