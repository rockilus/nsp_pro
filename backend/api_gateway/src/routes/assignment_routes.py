import time as time_module
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from shared.logger import log_info
from shared.schemas.core import (
    Assignment,
    RecurrenceRule,
    RecurrenceUpdateScope,
    ShiftType,
)
from shared.schemas.dto import (
    AssignmentDTO,
    AssignmentsRecurrencesResultDTO,
    BulkAssignmentCreateDTO,
    BulkAssignmentDeleteDTO,
    BulkAssignmentUpdateDTO,
    RecurrenceRuleDTO,
)
from shared.schemas.dto.replacement import ReplacementCandidateDTO

from src.dependencies import (
    get_assignment_service,
    get_replacement_service,
    get_user_context,
)
from src.dependencies.notification_service import get_notification_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.assignment_service import AssignmentService
from src.services.notification_service import (
    AssignmentOperation,
    NotificationService,
)
from src.services.replacement_service import ReplacementService

# pylint: disable=too-many-arguments, too-many-positional-arguments

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentDTO,
    recurrence: Optional[RecurrenceRuleDTO] = None,
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
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
        ar_result = assignment_service.create_assignment_and_recurrence(
            a_data, r_data
        )
        ops = [
            AssignmentOperation(before=None, after=a)
            for a in ar_result.assignments_created
        ]
        await notification_service.notify_assignment_crud(ops, team_id)
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to create assignment")
        handle_routes_errors(e)
    return response


@router.get("/assignments/teams/{team_id}")
async def get_assignments(
    team_id: str,
    start_date: date = Query(..., alias="start_date"),
    end_date: date = Query(..., alias="end_date"),
    include_campaign: bool = Query(False, alias="include_campaign"),
    worker_id: Optional[str] = Query(None, alias="worker_id"),
    shift_type: Optional[List[int]] = Query(None, alias="shift_type"),
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(
        get_assignment_service,
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        # Validate date range
        if end_date < start_date:
            raise ValueError(
                "end_date must be greater than or equal to start_date"
            )

        # Prevent abuse: reject ranges > 6 months
        max_range_days = 365
        if (end_date - start_date).days > max_range_days:
            raise ValueError(f"Date range cannot exceed {max_range_days} days")

        # Authorization strategy:
        # - If requesting campaign data (`include_campaign`), require full
        #   `read-assignments` permission and deny otherwise.
        # - For non-campaign requests prefer the faster
        #   `read-assignments-validated` check (fast path for members). If
        #   that fails, fall back to checking full `read-assignments` so
        #   admins/privileged users are still allowed.
        if include_campaign:
            if not await authz_check(
                user_context.user_id, "read-assignments", "team", team_id
            ):
                raise NotAuthorizedError(
                    "You do not have permission to get campaign assignments",
                )
        else:
            # Fast path: validated members
            if not await authz_check(
                user_context.user_id,
                "read-assignments-validated",
                "team",
                team_id,
            ):
                # Fall back to full permission for privileged users
                if not await authz_check(
                    user_context.user_id, "read-assignments", "team", team_id
                ):
                    raise NotAuthorizedError(
                        "You do not have permission to get assignments",
                    )

        start_time = time_module.time()
        ar_result = assignment_service.get_assignments_and_recurrences(
            team_id,
            start_date,
            end_date,
            include_campaign,
            worker_id,
            shift_types=(
                [ShiftType(v) for v in shift_type]
                if shift_type is not None
                else None
            ),
        )
        response = ar_result.to_dto()
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get assignments: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get assignments")
        handle_routes_errors(e)
    return response


@router.post("/assignments/bulk/teams/{team_id}", status_code=201)
async def bulk_create_assignments(
    team_id: str,
    body: BulkAssignmentCreateDTO,
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "create-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create assignments",
            )
        assignments = [Assignment.from_dto(a) for a in body.assignments]
        ar_result = assignment_service.bulk_create_assignments(assignments)
        ops = [
            AssignmentOperation(before=None, after=a)
            for a in ar_result.assignments_created
        ]
        await notification_service.notify_assignment_crud(ops, team_id)
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to bulk create assignments")
        handle_routes_errors(e)
    return response


@router.put("/assignments/bulk/teams/{team_id}")
async def bulk_update_assignments(
    team_id: str,
    body: BulkAssignmentUpdateDTO,
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update assignments",
            )
        assignments = [Assignment.from_dto(a) for a in body.assignments]
        # Pre-fetch "before" state
        ids = [a.id for a in assignments if a.id]
        before_map: dict[str, Assignment] = {}
        if ids:
            asgn_db = assignment_service.collection.assignment_db
            before_list = asgn_db.get_assignments_by_ids(ids)
            before_map = {a.id: a for a in before_list}
        ar_result = assignment_service.bulk_update_assignments(assignments)
        ops = [
            AssignmentOperation(
                before=before_map.get(a.id),
                after=a,
            )
            for a in ar_result.assignments_updated
        ]
        await notification_service.notify_assignment_crud(ops, team_id)
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to bulk update assignments")
        handle_routes_errors(e)
    return response


@router.delete("/assignments/bulk/teams/{team_id}")
async def bulk_delete_assignments(
    team_id: str,
    body: BulkAssignmentDeleteDTO,
    user_context: UserContext = Depends(get_user_context),
    assignment_service: AssignmentService = Depends(get_assignment_service),
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete assignments",
            )
        # Pre-fetch "before" state
        before_list = (
            assignment_service.collection.assignment_db.get_assignments_by_ids(
                body.ids
            )
        )
        ar_result = assignment_service.bulk_delete_assignments(body.ids)
        ops = [AssignmentOperation(before=a, after=None) for a in before_list]
        await notification_service.notify_assignment_crud(ops, team_id)
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to bulk delete assignments")
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
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an assignment",
            )
        assignment_data = Assignment.from_dto(assignment)
        # Pre-fetch "before" state
        before_assignment = (
            assignment_service.collection.assignment_db.get_assignment_by_id(
                assignment_data.id
            )
            if assignment_data.id
            else None
        )
        recurrence_update_scope_data = (
            RecurrenceUpdateScope(recurrence_update_scope)
            if recurrence_update_scope
            else None
        )
        recurrence_data = (
            RecurrenceRule.from_dto(recurrence) if recurrence else None
        )
        ar_result = assignment_service.update_assignment_and_recurrence(
            assignment_new=assignment_data,
            recurrence_update_scope=recurrence_update_scope_data,
            recurrence=recurrence_data,
        )
        ops = [
            AssignmentOperation(before=before_assignment, after=a)
            for a in ar_result.assignments_updated
        ]
        await notification_service.notify_assignment_crud(ops, team_id)
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
    notification_service: NotificationService = Depends(
        get_notification_service
    ),
) -> AssignmentsRecurrencesResultDTO:
    try:
        if not await authz_check(
            user_context.user_id, "delete-assignment", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an assignment",
            )
        # Pre-fetch "before" state
        before_assignment = (
            assignment_service.collection.assignment_db.get_assignment_by_id(
                assignment_id
            )
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
        ops = [AssignmentOperation(before=before_assignment, after=None)]
        await notification_service.notify_assignment_crud(ops, team_id)
        response = ar_result.to_dto()
    except Exception as e:
        log_info("Failed to delete assignment")
        handle_routes_errors(e)
    return response


@router.get(
    "/assignments/{assignment_id}/replacement-candidates/teams/{team_id}"
)
async def get_replacement_candidates(
    assignment_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    replacement_service: ReplacementService = Depends(get_replacement_service),
) -> list[ReplacementCandidateDTO]:
    try:
        if not await authz_check(
            user_context.user_id, "check-replacements", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to check replacement candidates",
            )
        candidates = replacement_service.get_replacement_candidates(
            assignment_id=assignment_id,
            team_id=team_id,
        )
        response = [candidate.to_dto() for candidate in candidates]
    except Exception as e:
        log_info(
            f"Failed to get replacement candidates for assignment {assignment_id}"
        )
        handle_routes_errors(e)
    return response
