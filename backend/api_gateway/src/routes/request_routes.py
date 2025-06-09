import time as time_module
from typing import List

from fastapi import APIRouter, Depends
from shared.logger import log_info
from shared.schemas.core import Request
from shared.schemas.dto import RequestDTO

from src.dependencies import get_request_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import (
    authz_check,
    authz_role_assignments_list,
)
from src.services.request_service import RequestService

router = APIRouter()


@router.post("/requests/teams/{team_id}", status_code=201)
async def create_request(
    team_id: str,
    req: RequestDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> RequestDTO:
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="create-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to create a request")

        roles = await authz_role_assignments_list(
            user_id=user_id,
            resource="team",
            resource_instance_key=team_id,
        )
        if len(roles) != 1:
            raise NotAuthorizedError("You do not have permission to create a request")
        r_data = Request.from_dto(req)
        request = request_service.create_request(
            request=r_data,
            author_id=user_id,
            team_role=roles[0],
        )
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to create request")
        handle_routes_errors(e)
    return response


@router.get("/requests/teams/{team_id}")
async def get_requests(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> List[RequestDTO]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-requests", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get requests")
        start_time = time_module.time()
        requests = request_service.get_requests(team_id)
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
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
):
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="update-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to update a request")
        roles = await authz_role_assignments_list(
            user_id=user_id,
            resource="team",
            resource_instance_key=team_id,
        )
        if len(roles) != 1:
            raise NotAuthorizedError("You do not have permission to create a request")
        r_data = Request.from_dto(updated_request)
        request = request_service.update_request(
            request=r_data,
            author_id=user_id,
            team_role=roles[0],
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
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> RequestDTO:
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="approve-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to approve a request")
        request = request_service.approve_request(request_id=request_id)
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to approve request")
        handle_routes_errors(e)
    return response


@router.post("/requests/{request_id}/teams/{team_id}/deny", status_code=200)
async def deny_request(
    request_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> RequestDTO:
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="deny-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to deny a request")
        request = request_service.deny_request(request_id=request_id)
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to deny request")
        handle_routes_errors(e)
    return response


@router.post("/requests/{request_id}/teams/{team_id}/rescind", status_code=200)
async def rescind_request(
    request_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> RequestDTO:
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="rescind-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to rescind a request")
        request = request_service.rescind_request(request_id=request_id)
        response = request.to_dto()
    except Exception as e:
        log_info("Failed to rescind request")
        handle_routes_errors(e)
    return response


@router.delete("/requests/{request_id}/teams/{team_id}")
async def delete_request(
    request_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
):
    try:
        user_id = session.get_user_id()
        if not await authz_check(
            user_id=user_id,
            action="delete-request",
            resource="team",
            resource_id=team_id,
        ):
            raise NotAuthorizedError("You do not have permission to delete a request")
        roles = await authz_role_assignments_list(
            user_id=user_id,
            resource="team",
            resource_instance_key=team_id,
        )
        if len(roles) != 1:
            raise NotAuthorizedError("You do not have permission to create a request")
        request_service.delete_request(
            request_id=request_id,
            author_id=user_id,
            team_role=roles[0],
        )
    except Exception as e:
        log_info("Failed to delete request")
        handle_routes_errors(e)
    return {"message": "Request deleted successfully"}
