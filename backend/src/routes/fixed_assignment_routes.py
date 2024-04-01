from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.fixed_assignment import FixedAssignment
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import FixedAssignmentMessage
from scripts.setup_database import fixed_assignment_db, worker_db

router = APIRouter()


@router.post("/fixed-assignments/teams/{team_id}", status_code=201)
async def create_fixed_assignment(
    team_id: str,
    req: FixedAssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> FixedAssignmentMessage:
    if not await authz_check(
        session.get_user_id(), "create-fixed-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a fixed assignment",
        )
    fa_data = api_msg_to_fixed_assignment(req)
    fixed_assignment = fixed_assignment_db.create_fixed_assignment(fa_data)
    response = fixed_assignment_to_api_msg(fixed_assignment)
    return response


@router.get("/fixed-assignments/teams/{team_id}")
async def get_fixed_assignments(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[FixedAssignmentMessage]:
    if not await authz_check(
        session.get_user_id(), "read-fixed-assignments", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get fixed assignments",
        )
    workers = worker_db.get_workers(team_id)
    fixed_assignments = fixed_assignment_db.get_fixed_assignments(workers)
    return [fixed_assignment_to_api_msg(fa) for fa in fixed_assignments]


@router.put("/fixed-assignments/{fixed_assignment_id}/teams/{team_id}")
async def update_fixed_assignment(
    fixed_assignment_id: str,
    team_id: str,
    updated_fixed_assignment: FixedAssignmentMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await authz_check(
        session.get_user_id(), "update-fixed-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a fixed assignment",
        )
    fa_data = api_msg_to_fixed_assignment(updated_fixed_assignment)
    existing_fa = fixed_assignment_db.get_fixed_assignment_by_id(fixed_assignment_id)
    if not existing_fa:
        raise HTTPException(status_code=404, detail="FixedAssignment does not exist")

    fixed_assignment = fixed_assignment_db.update_fixed_assignment(fa_data)

    response = fixed_assignment_to_api_msg(fixed_assignment)
    return response


@router.delete("/fixed-assignments/{fixed_assignment_id}/teams/{team_id}")
async def delete_fixed_assignment(
    fixed_assignment_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await authz_check(
        session.get_user_id(), "delete-fixed-assignment", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a fixed assignment",
        )
    fixed_assignment_db.delete_fixed_assignment(fixed_assignment_id)
    return {"message": "FixedAssignment deleted successfully"}


def fixed_assignment_to_api_msg(
    fixed_assignment: FixedAssignment,
) -> FixedAssignmentMessage:
    data = asdict(fixed_assignment)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(FixedAssignmentMessage)
    return validator.validate_python(as_dict)


def api_msg_to_fixed_assignment(
    msg: FixedAssignmentMessage,
) -> FixedAssignment:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["date"] = datetime.combine(data_snake["date"], datetime.min.time())
    return FixedAssignment(**data_snake)
