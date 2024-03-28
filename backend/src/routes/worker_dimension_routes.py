from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.worker import WorkerDimension, WorkerProperty
from routes.api_model import NewWorkerDimensionMessage, WorkerDimensionMessage
from routes.worker_routes import core_to_msg_worker_property
from scripts.setup_database import worker_db, worker_dimension_db, worker_property_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check
from services.deletion_services.delete_worker_dimension import (
    delete_worker_dimension as delete_worker_dimension_service,
)

router = APIRouter()


@router.post("/worker-dimensions/teams/{team_id}")
async def create_worker_dimension(
    team_id: str,
    worker_dimension: WorkerDimensionMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> NewWorkerDimensionMessage:
    if not await permit_check(
        session.get_user_id(), "create-worker-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a worker dimension",
        )
    wd_data = api_msg_to_worker_dimension(worker_dimension)
    wd_created = worker_dimension_db.create_worker_dimension(wd_data)
    properties = []
    if wd_created.entry_type == "bool":
        workers = worker_db.get_workers(team_id)
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
    return new_worker_dimension_to_api_msg(wd_created, properties)


@router.get("/worker-dimensions/teams/{team_id}")
async def get_worker_dimensions(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[WorkerDimensionMessage]:
    if not await permit_check(
        session.get_user_id(), "read-worker-dimensions", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get worker dimensions",
        )
    worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
    return [worker_dimension_to_api_msg(wd) for wd in worker_dimensions]


@router.put("/worker-dimensions/{worker_dimension_id}/teams/{team_id}")
async def update_worker_dimension(
    worker_dimension_id: str,
    team_id: str,
    worker_dimension: WorkerDimensionMessage,  # pylint: disable=W0613
    session: SessionContainerType = Depends(authn_verify_session()),
) -> WorkerDimensionMessage:
    if not await permit_check(
        session.get_user_id(), "update-worker-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a worker dimension",
        )
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


@router.delete("/worker-dimensions/{worker_dimension_id}/teams/{team_id}")
async def delete_worker_dimension(
    worker_dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await permit_check(
        session.get_user_id(), "delete-worker-dimension", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a worker dimension",
        )
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
        "newProperties": [core_to_msg_worker_property(wp) for wp in worker_properties],
    }
    validator = TypeAdapter(NewWorkerDimensionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_worker_dimension(
    msg: WorkerDimensionMessage,
) -> WorkerDimension:
    data_snake = humps.decamelize(msg.model_dump())
    return WorkerDimension(**data_snake)
