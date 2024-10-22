from dataclasses import asdict
from datetime import date, datetime
from typing import Dict, List, Optional

import humps
from fastapi import APIRouter, Depends, Query
from pydantic import TypeAdapter

from core import Assignment
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
from routes.api_model import AssignmentMessage
from scripts.setup_database import assignment_db, schedule_db

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> AssignmentMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an assignment",
            )
        a_data = msg_to_core_assignment(assignment)
        a_created = assignment_db.create_assignment(a_data)
        response = core_to_msg_assignment(a_created)
    except Exception as e:
        log_info("Failed to create assignment")
        handle_routes_errors(e)
    return response


@router.get("/assignments/teams/{team_id}")
async def get_assignments(
    team_id: str,
    start_date: Optional[date] = Query(None, alias="start_date"),
    end_date: Optional[date] = Query(None, alias="end_date"),
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[AssignmentMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-assignments", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get assignments",
            )
        schedules = schedule_db.get_schedules(team_id)
        if start_date is None or end_date is None:
            assignments = assignment_db.get_assignments(schedules)
        else:
            assignments = assignment_db.get_assignments_by_dates(
                start_date, end_date, schedules
            )
        response = [core_to_msg_assignment(a) for a in assignments]
    except Exception as e:
        log_info("Failed to get assignments")
        handle_routes_errors(e)
    return response


@router.put("/assignments/{assignment_id}/teams/{team_id}")
async def update_assignment(
    team_id: str,
    assignment_api: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> AssignmentMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an assignment",
            )
        assignment_data = msg_to_core_assignment(assignment_api)
        updated_assignment = assignment_db.update_assignment(assignment_data)
        response = core_to_msg_assignment(updated_assignment)
    except Exception as e:
        log_info("Failed to update assignment")
        handle_routes_errors(e)
    return response


@router.delete("/assignments/{assignment_id}/teams/{team_id}")
async def delete_assignment(
    assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an assignment",
            )
        assignment_db.delete_assignment(assignment_id)
    except Exception as e:
        log_info("Failed to delete assignment")
        handle_routes_errors(e)
    return {"message": "Assignment deleted"}


# Mappers
# core to message
def core_to_msg_assignment(assignment: Assignment) -> AssignmentMessage:
    try:
        data = asdict(assignment)
    except Exception as e:
        log_info("Failed to convert Assignment to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentMessage)
    try:
        a_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Assignment to AssignmentMessage")
        handle_message_errors(e)
    return a_msg


# message to core
def msg_to_core_assignment(msg: AssignmentMessage) -> Assignment:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.combine(data_snake["date"], datetime.min.time())
    try:
        assignment = Assignment(**data_snake)
    except Exception as e:
        log_info("Failed to convert AssignmentMessage to Assignment")
        handle_create_core_object_error(e)
    return assignment
