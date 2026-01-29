import time as time_module
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
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

from src.dependencies import get_assignment_service, get_user_context
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.assignment_service import AssignmentService

# pylint: disable=too-many-arguments, too-many-positional-arguments

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentDTO,
    recurrence: Optional[RecurrenceRuleDTO] = None,
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "create-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an assignment",
            )
        a_data = Assignment.from_dto(assignment)
        r_data: Optional[RecurrenceRule] = None
        if recurrence:
            r_data = RecurrenceRule.from_dto(recurrence)
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
    include_campaign: bool = Query(False, alias="include_campaign"),
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(
        get_assignment_service,
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        # Check if user has permission to read assignments
        if not await authz_check(
            user_context.user_id, "read-assignments", "team", team_id
        ):
            # If user doesn't have read-assignments (i.e., they're a member),
            # check if they have read-assignments-validated permission
            if not await authz_check(
                user_context.user_id,
                "read-assignments-validated",
                "team",
                team_id,
            ):
                raise NotAuthorizedError(
                    "You do not have permission to get assignments",
                )
            # Members are not allowed to request campaign assignments
            if include_campaign:
                raise NotAuthorizedError(
                    "You do not have permission to access campaign assignments",
                )

        start_time = time_module.time()
        ar_result = assignment_service.get_assignments_and_recurrences(
            team_id,
            start_date,
            end_date,
            include_campaign,
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
    assignment: AssignmentDTO,
    recurrence: Optional[RecurrenceRuleDTO] = None,
    recurrence_update_scope: Optional[int] = Query(
        None, alias="recurrence_update_scope"
    ),
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an assignment",
            )
        assignment_data = Assignment.from_dto(assignment)
        recurrence_update_scope_data = (
            RecurrenceUpdateScope(recurrence_update_scope)
            if recurrence_update_scope
            else None
        )
        recurrence_data = RecurrenceRule.from_dto(recurrence) if recurrence else None
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
    recurrence_id: Optional[str] = Query(None, alias="recurrence_id"),
    recurrence_update_scope: Optional[int] = Query(
        None, alias="recurrence_update_scope"
    ),
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an assignment",
            )
        recurrence_update_scope_data = (
            RecurrenceUpdateScope(recurrence_update_scope)
            if recurrence_update_scope
            else None
        )
        ar_result = assignment_service.delete_assignment_and_recurrence(
            assignment_id=assignment_id,
            recurrence_id=recurrence_id,
            recurrence_update_scope=recurrence_update_scope_data,
        )
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to delete assignment")
        handle_routes_errors(e)
    return response
