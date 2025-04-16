import time as time_module
from dataclasses import asdict
from datetime import date, datetime, time, timezone
from typing import Dict, Optional

import humps
from fastapi import APIRouter, Depends, Query
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas.core import (
    Assignment,
    RecurrenceRule,
    RecurrenceUpdateScope,
)
from shared.schemas.dto import (
    AssignmentDTO,
    AssignmentsRecurrencesResultDTO,
    RecurrenceRuleDTO,
)

from src.dependencies import get_assignment_service
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
from src.services.assignment_service import AssignmentService

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentDTO,
    recurrence_rule: Optional[RecurrenceRuleDTO] = None,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "create-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an assignment",
            )
        a_data = Assignment.from_dto(assignment)
        r_data: Optional[RecurrenceRule] = None
        if recurrence_rule:
            r_data = RecurrenceRule.from_dto(recurrence_rule)
        ar_result = assignment_service.create_assignment_and_recurrence(a_data, r_data)
        response = ar_result.to_dto()
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
    assignment_service: AssignmentService = Depends(
        get_assignment_service,
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "read-assignments", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get assignments",
            )
        start_time = time_module.time()
        ar_result = assignment_service.get_assignments_and_recurrences(
            team_id,
            start_date,
            end_date,
        )
        response = ar_result.to_dto()
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get assignments: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get assignments")
        handle_routes_errors(e)
    return response


# pylint: disable=too-many-arguments, too-many-positional-arguments, too-many-locals
@router.put("/assignments/{assignment_id}/teams/{team_id}")
async def update_assignment(
    team_id: str,
    assignment_api: AssignmentDTO,
    recurrence_update_scope: Optional[int] = None,
    recurrence_rule: Optional[RecurrenceRuleDTO] = None,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an assignment",
            )
        assignment_data = Assignment.from_dto(assignment_api)
        recurrence_update_scope_data = RecurrenceUpdateScope(recurrence_update_scope)
        recurrence_data = (
            RecurrenceRule.from_dto(recurrence_rule) if recurrence_rule else None
        )
        ar_result = assignment_service.update_assignment_and_recurrence(
            assignment_new=assignment_data,
            recurrence_update_scope=recurrence_update_scope_data,
            recurrence=recurrence_data,
        )
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to update assignment")
        handle_routes_errors(e)
    return response


@router.delete("/assignments/{assignment_id}/teams/{team_id}")
async def delete_assignment(
    assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an assignment",
            )
        deleted_ids = assignment_service.delete_assignment(assignment_id)
    except Exception as e:
        log_info("Failed to delete assignment")
        handle_routes_errors(e)
    return {"message": "Assignment deleted", "deleted_ids": deleted_ids}


# Mappers
# core to message
def core_to_msg_assignment(assignment: Assignment) -> AssignmentDTO:
    try:
        data = asdict(assignment)
    except Exception as e:
        log_info("Failed to convert Assignment to dictionary")
        raise MessageTypeError(str(e)) from e
    data["date"] = datetime.combine(
        assignment.date, time.min, tzinfo=timezone.utc
    ).timestamp()
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentDTO)
    try:
        a_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Assignment to AssignmentMessage")
        handle_message_errors(e)
    return a_msg
