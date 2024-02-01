from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.request import Request
from routes.api_model import RequestMessage
from scripts.setup_database import request_db, shift_db, worker_db

router = APIRouter()


@router.get("/requests")
def get_requests() -> List[RequestMessage]:
    requests = request_db.get_requests()
    return [request_to_api_msg(r) for r in requests]


@router.post("/requests", status_code=201)
def create_request(
    req: RequestMessage,
) -> RequestMessage:
    r_data = api_msg_to_request(req)
    worker = worker_db.get_worker_by_id(r_data.worker_id)
    shift = shift_db.get_shift_by_id(r_data.shift_id)

    request = request_db.create_request(
        worker,
        r_data.date,
        shift,
        r_data.priority,
    )

    response = request_to_api_msg(request)
    return response


@router.put("/requests/{request_id}")
def update_request(request_id: str, updated_request: RequestMessage):
    r_data = api_msg_to_request(updated_request)

    existing_r = request_db.get_request_by_id(request_id)
    if not existing_r:
        raise HTTPException(status_code=404, detail="Request does not exist")

    request = request_db.update_request(r_data)

    response = request_to_api_msg(request)
    return response


@router.delete("/requests/{request_id}")
def delete_request(request_id: str):
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
