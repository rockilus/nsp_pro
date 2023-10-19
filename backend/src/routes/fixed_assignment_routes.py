from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.fixed_assignment import FixedAssignment
from routes.api_model import FixedAssignmentMessage
from scripts.setup_database import fixed_assignment_db, shift_db, worker_db

router = APIRouter()


@router.get("/fixed-assignments")
def get_fixed_assignments() -> List[FixedAssignmentMessage]:
    fixed_assignments = fixed_assignment_db.get_fixed_assignments()
    return [fixed_assignment_to_api_msg(fa) for fa in fixed_assignments]


@router.post("/fixed-assignments", status_code=201)
def create_fixed_assignment(
    req: FixedAssignmentMessage,
) -> FixedAssignmentMessage:
    fa_data = api_msg_to_fixed_assignment(req)
    worker = worker_db.get_worker_by_id(fa_data.worker_id)
    shift = shift_db.get_shift_by_id(fa_data.shift_id)

    fixed_assignment = fixed_assignment_db.create_fixed_assignment(
        worker,
        fa_data.date,
        shift,
    )

    response = fixed_assignment_to_api_msg(fixed_assignment)
    return response


@router.put("/fixed-assignments/{fixed_assignment_id}")
def update_fixed_assignment(
    fixed_assignment_id: str, updated_fixed_assignment: FixedAssignmentMessage
):
    fa_data = api_msg_to_fixed_assignment(updated_fixed_assignment)

    existing_fa = fixed_assignment_db.get_fixed_assignment_by_id(fixed_assignment_id)
    if not existing_fa:
        raise HTTPException(status_code=404, detail="FixedAssignment does not exist")

    fixed_assignment = fixed_assignment_db.update_fixed_assignment(fa_data)

    response = fixed_assignment_to_api_msg(fixed_assignment)
    return response


@router.delete("/fixed-assignments/{fixed_assignment_id}")
def delete_fixed_assignment(fixed_assignment_id: str):
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
