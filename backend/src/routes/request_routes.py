from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.request import Request
from routes.api_model import RequestMessage
from scripts.setup_database import request_db, worker_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check

router = APIRouter()


@router.post("/requests/teams/{team_id}", status_code=201)
async def create_request(
    team_id: str,
    req: RequestMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> RequestMessage:
    if not await permit_check(session.get_user_id(), "create-request", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a request",
        )
    r_data = api_msg_to_request(req)
    request = request_db.create_request(r_data)
    response = request_to_api_msg(request)
    return response


@router.get("/requests/teams/{team_id}")
async def get_requests(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[RequestMessage]:
    if not await permit_check(session.get_user_id(), "read-requests", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get requests",
        )
    workers = worker_db.get_workers(team_id)
    requests = request_db.get_requests(workers)
    return [request_to_api_msg(r) for r in requests]


@router.put("/requests/{request_id}/teams/{team_id}")
async def update_request(
    request_id: str,
    team_id: str,
    updated_request: RequestMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(session.get_user_id(), "update-request", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a request",
        )
    r_data = api_msg_to_request(updated_request)
    existing_r = request_db.get_request_by_id(request_id)
    if not existing_r:
        raise HTTPException(status_code=404, detail="Request does not exist")

    request = request_db.update_request(r_data)

    response = request_to_api_msg(request)
    return response


@router.delete("/requests/{request_id}/teams/{team_id}")
async def delete_request(
    request_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(session.get_user_id(), "delete-request", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a request",
        )
    request_db.delete_request(request_id)
    return {"message": "Request deleted successfully"}


def request_to_api_msg(
    request: Request,
) -> RequestMessage:
    data = asdict(request)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(RequestMessage)
    return validator.validate_python(as_dict)


def api_msg_to_request(
    msg: RequestMessage,
) -> Request:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.combine(data_snake["date"], datetime.min.time())
    return Request(**data_snake)
