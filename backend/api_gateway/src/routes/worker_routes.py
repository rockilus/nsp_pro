import time as time_module
from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Worker
from shared.schemas.dto import WorkerDTO

from src.dependencies import get_db_collections, get_worker_service
from src.dependencies.auth_dependencies import get_user_context
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.worker_service import WorkerService

router = APIRouter()


@router.post("/workers/teams/{team_id}")
async def create_worker(
    team_id: str,
    worker: WorkerDTO,
    user_context: UserContext = Depends(get_user_context),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerDTO:
    try:
        if not await authz_check(user_context, "create-worker", "team", team_id):
            raise NotAuthorizedError("You do not have permission to create a worker")
        w_data = Worker.from_dto(worker)
        worker_created, a_bool = worker_service.create_worker(w_data)
        response = worker_created.to_dto(a_bool)
    except Exception as e:
        log_info("Failed to create worker")
        handle_routes_errors(e)
    return response


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
    try:
        if not await authz_check(user_context, "read-workers", "team", team_id):
            raise NotAuthorizedError("You do not have permission to get workers")
        workers = db_collections.worker_db.get_workers_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(worker.id)
            for worker in workers
        ]
        response = [w.to_dto(attr) for w, attr in zip(workers, attributes)]
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.get("/workers/all/teams/{team_id}")
async def get_all_workers(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
    try:
        if not await authz_check(user_context, "read-workers", "team", team_id):
            raise NotAuthorizedError("You do not have permission to get workers")
        start_time = time_module.time()
        workers = db_collections.worker_db.get_workers(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(worker.id)
            for worker in workers
        ]
        response = [w.to_dto(attr) for w, attr in zip(workers, attributes)]
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
    worker: WorkerDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerDTO:
    try:
        if not await authz_check(user_context, "update-worker", "team", team_id):
            raise NotAuthorizedError("You do not have permission to update a worker")
        w_data = Worker.from_dto(worker)
        updated_worker = worker_service.update_worker(w_data)
        attributes = db_collections.attribute_db.get_attributes_by_owner_id(
            updated_worker.id
        )
        response = updated_worker.to_dto(attributes)
    except Exception as e:
        log_info("Failed to update worker")
        handle_routes_errors(e)
    return response


class WorkerAttachRequest(BaseModel):
    user_id: str
    # team_id: str


# pylint: disable=too-many-arguments, too-many-positional-arguments
@router.post("/workers/{worker_id}/attach_user/teams/{team_id}")
async def attach_user_to_worker(
    worker_id: str,
    request: WorkerAttachRequest,
    # user_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    worker_service: WorkerService = Depends(get_worker_service),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
    try:
        if not await authz_check(
            user_context,
            "update-worker",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to add a user to this worker"
            )
        user_id = request.user_id
        updated_workers = worker_service.attach_user_to_worker(
            worker_id, user_id, team_id
        )
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(owner_id=w.id)
            for w in updated_workers
        ]
        response = [w.to_dto(attr) for w, attr in zip(updated_workers, attributes)]
    except Exception as e:
        log_info("Failed to add user to worker")
        handle_routes_errors(e)
    return response


@router.delete("/workers/{worker_id}/teams/{team_id}")
async def delete_worker(
    worker_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    worker_service: WorkerService = Depends(get_worker_service),
) -> Dict:
    try:
        if not await authz_check(user_context, "delete-worker", "team", team_id):
            raise NotAuthorizedError("You do not have permission to delete a worker")
        worker_service.delete_worker(worker_id)
    except Exception as e:
        log_info("Failed to delete worker")
        handle_routes_errors(e)
    return {"message": "Worker deleted"}
