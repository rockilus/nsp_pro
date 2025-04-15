import time as time_module
from dataclasses import asdict
from datetime import date, datetime, time, timezone
from typing import Dict, List, Optional

import humps
from fastapi import APIRouter, Depends, Query
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import (
    Assignment,
    RecurrenceRule,
    RecurrenceUpdateScope,
)
from shared.schemas.dto import AssignmentDTO, RecurrenceRuleDTO
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
from src.services.assignment_service import AssignmentService

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentDTO,
    recurrence_rule: Optional[RecurrenceRuleDTO] = None,
    session: SessionContainerType = Depends(authn_verify_session()),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> Dict[str, List[AssignmentDTO] | Optional[RecurrenceRuleDTO]]:
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
        a_and_r_created = assignment_service.create_assignment_and_recurrence(
            a_data, r_data
        )
        created_assignments: List[Assignment] = a_and_r_created.get(  # type: ignore
            "assignments", []
        )
        created_recurrence_rule: Optional[
            RecurrenceRule
        ] = a_and_r_created.get(
            "recurrences", None
        )  # type: ignore
        response = {
            "assignments": [a.to_dto() for a in created_assignments],
            "recurrences": (
                created_recurrence_rule.to_dto()
                if created_recurrence_rule
                else None
            ),
        }
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
    assignment_service: AssignmentService = Depends(
        get_assignment_service,
    ),
) -> List[AssignmentDTO]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-assignments", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get assignments",
            )
        start_time = time_module.time()
        a_and_r = assignment_service.get_assignments_and_recurrences(
            team_id,
            start_date,
            end_date,
        )
        assignments: List[Assignment] = a_and_r.get("assignments", [])
        recurrences: List[RecurrenceRule] = a_and_r.get("recurrences", [])
        response = {
            "assignments": [a.to_dto() for a in assignments],
            "recurrences": [r.to_dto() for r in recurrences],
        }
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
    assignment_api: AssignmentDTO,
    recurrence_update_scope: RecurrenceUpdateScope,
    recurrence_rule: Optional[RecurrenceRuleDTO] = None,
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
        assignment_data = Assignment.from_dto(assignment_api)
        updated_assignment_data = (
            assignment_service.update_assignment_and_recurrence(
                assignment_data
            )
        )
        response = {
            "updated_assignment": (
                core_to_msg_assignment(
                    updated_assignment_data.get(
                        "updated_assignment", None
                    ).to_dto()
                )
                if updated_assignment_data.get("updated_assignment", None)
                else None
            ),
            "recuperation_assignments": [
                core_to_msg_assignment(a)
                for a in updated_assignment_data.get(
                    "recuperation_assignments", []
                )
            ],
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
