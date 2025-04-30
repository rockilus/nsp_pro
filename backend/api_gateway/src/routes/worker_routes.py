import time as time_module
from typing import Dict, List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Worker
from shared.schemas.dto import WorkerDTO

from src.dependencies import get_db_collections, get_worker_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.worker_service import WorkerService

router = APIRouter()


@router.post("/workers/teams/{team_id}")
async def create_worker(
    team_id: str,
    worker: WorkerDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "create-worker", "team", team_id
        ):
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
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
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
        response = [w.to_dto(attr) for w, attr in zip(workers, attributes)]
    except Exception as e:
        log_info("Failed to get workers")
        handle_routes_errors(e)
    return response


@router.get("/workers/all/teams/{team_id}")
async def get_all_workers(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
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
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    worker_service: WorkerService = Depends(get_worker_service),
) -> WorkerDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "update-worker", "team", team_id
        ):
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
