from dataclasses import asdict
from typing import List, Union

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from core.coverage import Coverage
from core.schedule import Assignment, Schedule
from engine import Engine
from routes.api_model import AssignmentMessage, ScheduleMessage
from scripts.setup_database import (
    coverage_db,
    coverage_selector_db,
    fixed_assignment_db,
    request_db,
    shift_db,
    worker_db,
)
from services import (
    build_no_coverage_date,
    from_core_to_inputs,
    from_outputs_to_core,
    update_far_status,
)

router = APIRouter()


@router.get("/schedule")
def solver() -> ScheduleMessage:
    workers = worker_db.get_workers()
    shifts = shift_db.get_shifts()
    coverage_selectors = coverage_selector_db.get_coverage_selectors()
    coverages: List[Union[Coverage, None]] = []
    for coverage_selector in coverage_selectors:
        if coverage_selector.coverage_id == "":
            coverages.append(None)
            continue
        coverage = coverage_db.get_coverage_by_id(coverage_selector.coverage_id)
        coverages.append(coverage)
    fixed_assignments = fixed_assignment_db.get_fixed_assignments()
    requests = request_db.get_requests()
    inputs = from_core_to_inputs(
        workers,
        shifts,
        coverage_selectors,
        coverages,
        fixed_assignments,
        requests,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    schedule, assignments = from_outputs_to_core(inputs, outputs)
    no_cov_date = build_no_coverage_date(
        inputs.variable_space.start_date,
        inputs.variable_space.end_date,
        coverage_selectors,
    )
    schedule.comments.missing_coverage_dates = no_cov_date
    update_far_status(schedule, assignments)
    return schedule_and_assignments_to_api_msg(schedule, assignments)


def assignment_to_api_msg(
    assignment: Assignment,
) -> AssignmentMessage:
    data = asdict(assignment)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentMessage)
    return validator.validate_python(as_dict)


def schedule_and_assignments_to_api_msg(
    schedule: Schedule, assignments: List[Assignment]
) -> ScheduleMessage:
    assignments_message = [assignment_to_api_msg(a) for a in assignments]
    data = asdict(schedule)
    data["assignments"] = assignments_message
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ScheduleMessage)
    return validator.validate_python(as_dict)


def api_msg_to_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "assignments"}
    return Schedule(**data_snake)
