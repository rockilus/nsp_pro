import time as time_module
from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import Request, RequestAugmented, RequestStatus
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_request_service
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
from src.routes.api_model import RequestMessage
from src.services.request_service import RequestService

router = APIRouter()


@router.post("/requests/teams/{team_id}", status_code=201)
async def create_request(
    team_id: str,
    req: RequestMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> RequestMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-request", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a request")
        r_data = msg_to_core_request(req)
        request = request_service.create_request(r_data)
        response = core_to_msg_request_augmented(request)
    except Exception as e:
        log_info("Failed to create request")
        handle_routes_errors(e)
    return response


@router.get("/requests/teams/{team_id}")
async def get_requests(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
) -> List[RequestMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-requests", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get requests")
        start_time = time_module.time()
        requests = request_service.get_requests(team_id)
        response = [core_to_msg_request_augmented(r) for r in requests]
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
    updated_request: RequestMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    request_service: RequestService = Depends(get_request_service),
):
    try:
        if not await authz_check(
            session.get_user_id(), "update-request", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a request")
        r_data = msg_to_core_request(updated_request)
        request = request_service.update_request(r_data)
        response = core_to_msg_request_augmented(request)
    except Exception as e:
        log_info("Failed to update request")
        handle_routes_errors(e)
    return response


@router.delete("/requests/{request_id}/teams/{team_id}")
async def delete_request(
    request_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
):
    try:
        if not await authz_check(
            session.get_user_id(), "delete-request", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete a request")
        db_collections.request_db.delete_request(request_id)
    except Exception as e:
        log_info("Failed to delete request")
        handle_routes_errors(e)
    return {"message": "Request deleted successfully"}


# Mappers
# core to message
def core_to_msg_request_augmented(request: RequestAugmented) -> RequestMessage:
    try:
        data = asdict(request)
    except Exception as e:
        log_info("Failed to convert Request to dictionary")
        raise MessageTypeError(str(e)) from e
    data["start_date"] = datetime.combine(
        request.start_date, time.min, tzinfo=timezone.utc
    ).timestamp()
    data["end_date"] = datetime.combine(
        request.end_date, time.min, tzinfo=timezone.utc
    ).timestamp()
    as_dict = humps.camelize(data)
    validator = TypeAdapter(RequestMessage)
    try:
        r_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Request to RequestMessage")
        handle_message_errors(e)
    return r_msg


# message to core
def msg_to_core_request(msg: RequestMessage) -> Request:
    # pylint: disable=R0801
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_date"] = datetime.fromtimestamp(
        data_snake["start_date"], timezone.utc
    ).date()
    data_snake["end_date"] = datetime.fromtimestamp(
        data_snake["end_date"], timezone.utc
    ).date()
    data_snake["status"] = RequestStatus(data_snake["status"])
    data_snake.pop("active")
    try:
        request = Request(**data_snake)
    except Exception as e:
        log_info("Failed to convert RequestMessage to Request")
        handle_create_schema_object_error(e)
    return request
