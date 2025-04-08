import time as time_module
from dataclasses import asdict
from datetime import date, datetime, time, timezone
from typing import Dict, List, Optional

import humps
from fastapi import APIRouter, Depends, Query
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import Assignment
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_assignment_service, get_db_collections
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
from src.routes.api_model import AssignmentMessage
from src.services.assignment_service import AssignmentService

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> List[AssignmentMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "create-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an assignment",
            )
        a_data = msg_to_core_assignment(assignment)
        a_created = assignment_service.create_assignment(a_data)
        response = [core_to_msg_assignment(a) for a in a_created]
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
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[AssignmentMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-assignments", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get assignments",
            )
        start_time = time_module.time()
        if start_date is None or end_date is None:
            assignments = db_collections.assignment_db.get_assignments(team_id)
        else:
            assignments = db_collections.assignment_db.get_assignments_by_dates(
                team_id, start_date, end_date
            )
        response = [core_to_msg_assignment(a) for a in assignments]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get assignments: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get assignments")
        handle_routes_errors(e)
    return response


@router.put("/assignments/{assignment_id}/teams/{team_id}")
async def update_assignment(
    team_id: str,
    assignment_api: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an assignment",
            )
        assignment_data = msg_to_core_assignment(assignment_api)
        updated_assignment_data = assignment_service.update_assignment(assignment_data)
        response = {
            "updated_assignment": (
                core_to_msg_assignment(
                    updated_assignment_data.get("updated_assignment", None)
                )
                if updated_assignment_data.get("updated_assignment", None)
                else None
            ),
            "recuperation_assignment": (
                core_to_msg_assignment(
                    updated_assignment_data.get("recuperation_assignment", None)
                )
                if updated_assignment_data.get("recuperation_assignment", None)
                else None
            ),
            "deleted_ids": updated_assignment_data.get("deleted_ids", []),
        }
    except Exception as e:
        log_info("Failed to update assignment")
        handle_routes_errors(e)
    return response


@router.delete("/assignments/{assignment_id}/teams/{team_id}")
async def delete_assignment(
    assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an assignment",
            )
        db_collections.assignment_db.delete_assignment(assignment_id)
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
    data["date"] = datetime.combine(
        assignment.date, time.min, tzinfo=timezone.utc
    ).timestamp()
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
    data_snake["date"] = datetime.fromtimestamp(data_snake["date"], timezone.utc).date()
    try:
        assignment = Assignment(**data_snake)
    except Exception as e:
        log_info("Failed to convert AssignmentMessage to Assignment")
        handle_create_schema_object_error(e)
    return assignment
