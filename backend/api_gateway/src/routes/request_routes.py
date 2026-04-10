import time as time_module
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from shared.logger import log_info
from shared.schemas.core import Request
from shared.schemas.dto import RequestDTO

from src.dependencies import get_request_service, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.request_service import RequestService

router = APIRouter()


# pylint: disable=R0801
@router.post("/requests/teams/{team_id}", status_code=201)
async def create_request(
    team_id: str,
    req: RequestDTO,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> RequestDTO:
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="create-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a request"
            )

        team_role = await authz.get_user_team_role(
            user_id=user_context.effective_user_id,
            team_id=team_id,
        )
        if team_role is None:
            raise NotAuthorizedError(
                "You do not have permission to create a request"
            )
        r_data = Request.from_dto(req)
        request = await request_service.create_request(
            request=r_data,
            author_id=user_context.effective_user_id,
            team_role=team_role,
        )
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to create request")
        handle_routes_errors(e)
    return response


@router.get("/requests/teams/{team_id}")
async def get_requests(
    team_id: str,
    worker_id: Optional[str] = Query(
        None, description="Optional worker ID to filter requests"
    ),
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[RequestDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-requests", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get requests"
            )

        # Get user role to determine filtering behavior
        team_role = await authz.get_user_team_role(
            user_id=user_context.effective_user_id,
            team_id=team_id,
        )
        if team_role is None:
            raise NotAuthorizedError(
                "You do not have permission to get requests"
            )

        # If member role, auto-detect their worker and filter
        filter_worker_id = None
        if team_role == "member":
            # Get workers linked to this user
            workers = request_service.collection.worker_db.get_workers_by_team_and_user(
                team_id=team_id, user_id=user_context.effective_user_id
            )
            if workers:
                # Use first worker (assumption: one worker per user per team)
                filter_worker_id = workers[0].id
            # If no worker found, filter_worker_id stays None (returns empty)
        elif worker_id:
            # Owner explicitly filtering by worker_id
            filter_worker_id = worker_id

        start_time = time_module.time()
        requests = request_service.get_requests(
            team_id, worker_id=filter_worker_id
        )
        response = [r.to_dto() for r in requests]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get requests: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get requests")
        handle_routes_errors(e)
    return response


@router.put("/requests/{request_id}/teams/{team_id}")
async def update_request(
    team_id: str,
    updated_request: RequestDTO,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="update-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a request"
            )
        team_role = await authz.get_user_team_role(
            user_id=user_context.effective_user_id,
            team_id=team_id,
        )
        if team_role is None:
            raise NotAuthorizedError(
                "You do not have permission to update a request"
            )
        r_data = Request.from_dto(updated_request)
        request = request_service.update_request(
            request=r_data,
            author_id=user_context.effective_user_id,
            team_role=team_role,
        )
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to update request")
        handle_routes_errors(e)
    return response


@router.post("/requests/{request_id}/teams/{team_id}/accept", status_code=200)
async def accept_request(
    request_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> dict:
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="approve-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to approve a request"
            )
        request, assignments = await request_service.approve_request(
            request_id=request_id
        )
        response = {
            "request": request.to_dto(),
            "assignments": (
                [a.to_dto() for a in assignments] if assignments else []
            ),
        }
    except Exception as e:
        log_info("Failed to approve request")
        handle_routes_errors(e)
    return response


@router.post("/requests/{request_id}/teams/{team_id}/deny", status_code=200)
async def deny_request(
    request_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> RequestDTO:
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="deny-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to deny a request"
            )
        request = await request_service.deny_request(request_id=request_id)
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to deny request")
        handle_routes_errors(e)
    return response


@router.post("/requests/{request_id}/teams/{team_id}/rescind", status_code=200)
async def rescind_request(
    request_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> dict:
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="rescind-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to rescind a request"
            )
        request, deleted_ids = request_service.rescind_request(
            request_id=request_id
        )
        response = {
            "request": request.to_dto(),
            "assignmentsDeletedIds": deleted_ids,
        }
    except Exception as e:
        log_info("Failed to rescind request")
        handle_routes_errors(e)
    return response


@router.delete("/requests/{request_id}/teams/{team_id}")
async def delete_request(
    request_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    request_service: RequestService = Depends(get_request_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
):
    try:
        if not await authz.check(
            user_id=user_context.user_id,
            action="delete-request",
            resource_kind="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a request"
            )
        team_role = await authz.get_user_team_role(
            user_id=user_context.effective_user_id,
            team_id=team_id,
        )
        if team_role is None:
            raise NotAuthorizedError(
                "You do not have permission to delete a request"
            )
        request_service.delete_request(
            request_id=request_id,
            author_id=user_context.effective_user_id,
            team_role=team_role,
        )
    except Exception as e:
        log_info("Failed to delete request")
        handle_routes_errors(e)
    return {"message": "Request deleted successfully"}
