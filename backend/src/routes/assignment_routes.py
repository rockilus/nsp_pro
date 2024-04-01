from dataclasses import asdict
from datetime import datetime
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.schedule import Assignment
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import AssignmentMessage
from scripts.setup_database import assignment_db, schedule_db

router = APIRouter()


@router.post("/assignments/teams/{team_id}", status_code=201)
async def create_assignment(
    team_id: str,
    assignment: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> AssignmentMessage:
    if not await authz_check(
        session.get_user_id(), "create-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create an assignment",
        )
    a_data = api_msg_to_assignment(assignment)
    a_created = assignment_db.create_assignment(a_data)
    return assignment_to_api_msg(a_created)


@router.get("/assignments/teams/{team_id}")
async def get_assignments(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[AssignmentMessage]:
    if not await authz_check(
        session.get_user_id(), "read-assignments", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get assignments",
        )
    schedules = schedule_db.get_schedules(team_id)
    assignments = assignment_db.get_assignments(schedules)
    return [assignment_to_api_msg(a) for a in assignments]


@router.put("/assignments/{assignment_id}/teams/{team_id}")
async def update_assignment(
    assignment_id: str,
    team_id: str,
    assignment_api: AssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> AssignmentMessage:
    if not await authz_check(
        session.get_user_id(), "update-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update an assignment",
        )
    existing_assignment = assignment_db.get_assignment_by_id(assignment_id)
    if not existing_assignment:
        raise HTTPException(status_code=404, detail="Assignment does not exist")
    assignment_data = api_msg_to_assignment(assignment_api)
    updated_assignment = assignment_db.update_assignment(assignment_data)
    return assignment_to_api_msg(updated_assignment)


@router.delete("/assignments/{assignment_id}/teams/{team_id}")
async def delete_assignment(
    assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await authz_check(
        session.get_user_id(), "delete-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete an assignment",
        )
    assignment_db.delete_assignment(assignment_id)
    return {"message": "Assignment deleted"}


def assignment_to_api_msg(assignment: Assignment) -> AssignmentMessage:
    data = asdict(assignment)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentMessage)
    return validator.validate_python(as_dict)


def api_msg_to_assignment(
    msg: AssignmentMessage,
) -> Assignment:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.combine(data_snake["start_date"], datetime.min.time())
    return Assignment(**data_snake)
