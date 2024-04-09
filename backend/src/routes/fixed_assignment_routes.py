from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import FixedAssignment
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
from routes.api_model import FixedAssignmentMessage
from scripts.setup_database import fixed_assignment_db, worker_db

router = APIRouter()


@router.post("/fixed-assignments/teams/{team_id}", status_code=201)
async def create_fixed_assignment(
    team_id: str,
    req: FixedAssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> FixedAssignmentMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-fixed-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a fixed assignment"
            )
        fa_data = msg_to_core_fixed_assignment(req)
        fixed_assignment = fixed_assignment_db.create_fixed_assignment(fa_data)
        response = core_to_msg_fixed_assignment(fixed_assignment)
    except Exception as e:
        log_info("Failed to create fixed assignment")
        handle_routes_errors(e)
    return response


@router.get("/fixed-assignments/teams/{team_id}")
async def get_fixed_assignments(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[FixedAssignmentMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-fixed-assignments", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get fixed assignments"
            )
        workers = worker_db.get_workers(team_id)
        fixed_assignments = fixed_assignment_db.get_fixed_assignments(workers)
        response = [core_to_msg_fixed_assignment(fa) for fa in fixed_assignments]
    except Exception as e:
        log_info("Failed to get fixed assignments")
        handle_routes_errors(e)
    return response


@router.put("/fixed-assignments/{fixed_assignment_id}/teams/{team_id}")
async def update_fixed_assignment(
    team_id: str,
    updated_fixed_assignment: FixedAssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    try:
        if not await authz_check(
            session.get_user_id(), "update-fixed-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a fixed assignment"
            )
        fa_data = msg_to_core_fixed_assignment(updated_fixed_assignment)
        fixed_assignment = fixed_assignment_db.update_fixed_assignment(fa_data)
        response = core_to_msg_fixed_assignment(fixed_assignment)
    except Exception as e:
        log_info("Failed to update fixed assignment")
        handle_routes_errors(e)
    return response


@router.delete("/fixed-assignments/{fixed_assignment_id}/teams/{team_id}")
async def delete_fixed_assignment(
    fixed_assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    try:
        if not await authz_check(
            session.get_user_id(), "delete-fixed-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a fixed assignment"
            )
        fixed_assignment_db.delete_fixed_assignment(fixed_assignment_id)
    except Exception as e:
        log_info("Failed to delete fixed assignment")
        handle_routes_errors(e)
    return {"message": "FixedAssignment deleted successfully"}


# Mappers
# core to message
def core_to_msg_fixed_assignment(
    fixed_assignment: FixedAssignment,
) -> FixedAssignmentMessage:
    try:
        data = asdict(fixed_assignment)
    except Exception as e:
        log_info("Failed to convert FixedAssignment to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(FixedAssignmentMessage)
    try:
        fa_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert FixedAssignment to FixedAssignmentMessage")
        handle_message_errors(e)
    return fa_msg


# message to core
def msg_to_core_fixed_assignment(
    msg: FixedAssignmentMessage,
) -> FixedAssignment:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.combine(data_snake["date"], datetime.min.time())
    try:
        fixed_assignment = FixedAssignment(**data_snake)
    except Exception as e:
        log_info("Failed to convert FixedAssignmentMessage to FixedAssignment")
        handle_create_core_object_error(e)
    return fixed_assignment
