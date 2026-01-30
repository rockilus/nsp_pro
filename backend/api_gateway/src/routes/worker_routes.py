import time as time_module
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Worker
from shared.schemas.dto import WorkerDTO

from src.dependencies import (
    get_db_collections,
    get_user_context,
    get_worker_service,
)
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
    """
    Create a new worker for the specified team.

    Authorization includes automatic retry logic based on configuration
    to handle policy sync timing issues with Permit.io.
    """
    try:
        log_info(f"Creating worker for team {team_id}, user {user_context.user_id}")

        # Simple authorization check - retry logic is handled internally
        if not await authz_check(
            user_context.user_id, "create-worker", "team", team_id
        ):
            log_info(
                f"Authorization denied for user {user_context.user_id} "
                f"to create worker in team {team_id}"
            )
            raise NotAuthorizedError("You do not have permission to create a worker")

        log_info(
            f"Authorization successful for user {user_context.user_id} "
            f"to create worker in team {team_id}"
        )

        w_data = Worker.from_dto(worker)
        worker_created, a_bool = worker_service.create_worker(w_data)
        response = worker_created.to_dto(a_bool)

        log_info(
            f"Worker created successfully for team {team_id}: " f"{worker_created.id}"
        )

    except NotAuthorizedError:
        # Re-raise authorization errors without additional logging
        raise
    except Exception as e:
        log_info(f"Failed to create worker for team {team_id}: {str(e)}")
        handle_routes_errors(e)

    return response


@router.get("/workers/teams/{team_id}")
async def get_workers(
    team_id: str,
    worker_id: Optional[str] = Query(None, description="Optional worker ID to filter"),
    include_deleted: bool = Query(False, description="Include deleted workers"),
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[WorkerDTO]:
    """
    Get workers for a team with optional filtering.

    Args:
        team_id: Team ID to get workers for
        worker_id: Optional worker ID to filter by specific worker
        include_deleted: Whether to include deleted workers (default: False)

    Returns:
        List of workers matching the criteria
    """
    try:
        if not await authz_check(user_context.user_id, "read-workers", "team", team_id):
            raise NotAuthorizedError("You do not have permission to get workers")

        start_time = time_module.time()

        # Fetch workers based on include_deleted flag
        if include_deleted:
            workers = db_collections.worker_db.get_workers(team_id)
        else:
            workers = db_collections.worker_db.get_workers_not_deleted(team_id)

        # Filter by specific worker if worker_id provided
        if worker_id:
            workers = [w for w in workers if w.id == worker_id]

        # Get attributes for all workers
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(worker.id)
            for worker in workers
        ]
        response = [w.to_dto(attr) for w, attr in zip(workers, attributes)]

        end_time = time_module.time()
        time_taken = round(end_time - start_time, 2)
        log_info(f"Time taken to get workers: {time_taken} seconds")
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
        if not await authz_check(
            user_context.user_id, "update-worker", "team", team_id
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
            user_context.user_id, "update-worker", "team", team_id
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
        if not await authz_check(
            user_context.user_id, "delete-worker", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete a worker")
        worker_service.delete_worker(worker_id)
    except Exception as e:
        log_info("Failed to delete worker")
        handle_routes_errors(e)
    return {"message": "Worker deleted"}
