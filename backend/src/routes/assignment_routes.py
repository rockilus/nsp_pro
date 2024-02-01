from dataclasses import asdict
from datetime import datetime
from typing import Dict, List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.schedule import Assignment
from routes.api_model import AssignmentMessage
from scripts.setup_database import assignment_db, schedule_db, shift_db, worker_db

router = APIRouter()


@router.post("/assignments", status_code=201)
def create_assignment(req: AssignmentMessage) -> AssignmentMessage:
    a_data = api_msg_to_assignment(req)
    worker = worker_db.get_worker_by_id(a_data.worker_id)
    shift = shift_db.get_shift_by_id(a_data.shift_id)
    schedule = schedule_db.get_schedule_by_id(a_data.schedule_id)
    assignment = assignment_db.create_assignment(
        worker, a_data.date, shift, schedule, a_data.status
    )
    return assignment_to_api_msg(assignment)


@router.get("/assignments")
def get_assignments() -> List[AssignmentMessage]:
    assignments = assignment_db.get_assignments()
    return [assignment_to_api_msg(a) for a in assignments]


@router.put("/assignments/{assignment_id}")
def update_assignment(
    assignment_id: str, assignment_api: AssignmentMessage
) -> AssignmentMessage:
    existing_assignment = assignment_db.get_assignment_by_id(assignment_id)
    if not existing_assignment:
        raise HTTPException(status_code=404, detail="Assignment does not exist")
    assignment_data = api_msg_to_assignment(assignment_api)
    updated_assignment = assignment_db.update_assignment(assignment_data)
    return assignment_to_api_msg(updated_assignment)


@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: str) -> Dict:
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
