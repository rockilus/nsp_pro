from dataclasses import asdict
from datetime import datetime
from typing import List

import humps
from fastapi import APIRouter
from pydantic import TypeAdapter

from core.schedule import (
    Assignment,
    Comments,
    ConstraintBreach,
    Schedule,
    ScheduleOptions,
)
from routes.api_model import (
    AssignmentMessage,
    CommentsMessage,
    ConstraintBreachMessage,
    ScheduleMessage,
    ScheduleOptionsMessage,
)
from services import create_schedule as create_schedule_service

router = APIRouter()


@router.post("/schedule", status_code=201)
def create_schedule(req: ScheduleOptionsMessage) -> ScheduleMessage:
    so_data = api_msg_to_schedule_options(req)
    schedule, assignments = create_schedule_service(so_data)
    return schedule_and_assignments_to_api_msg(schedule, assignments)


# @router.get("/schedule")
# def solver() -> ScheduleMessage:
#     workers = worker_db.get_workers()
#     shifts = shift_db.get_shifts()
#     coverage_selectors = coverage_selector_db.get_coverage_selectors()
#     coverages: List[Union[Coverage, None]] = []
#     for coverage_selector in coverage_selectors:
#         if coverage_selector.coverage_id == "":
#             coverages.append(None)
#             continue
#         coverage = coverage_db.get_coverage_by_id(
#             coverage_selector.coverage_id
#         )
#         coverages.append(coverage)
#     fixed_assignments = fixed_assignment_db.get_fixed_assignments()
#     requests = request_db.get_requests()
#     constraints = constraint_db.get_constraints_active()
#     inputs = core_to_engine_inputs(
#         workers,
#         shifts,
#         coverage_selectors,
#         coverages,
#         fixed_assignments,
#         requests,
#         constraints,
#     )
#     engine = Engine()
#     outputs = engine.solve(inputs)
#     schedule, assignments = from_outputs_to_core(inputs, outputs)
#     no_cov_date = build_no_coverage_date(
#         inputs.variable_space.start_date,
#         inputs.variable_space.end_date,
#         coverage_selectors,
#     )
#     schedule.comments.missing_coverage_dates = no_cov_date
#     update_far_status(schedule, assignments)
#     return schedule_and_assignments_to_api_msg(schedule, assignments)


def constraint_breach_to_api_msg(
    constraint_breach: ConstraintBreach,
) -> ConstraintBreachMessage:
    data = asdict(constraint_breach)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintBreachMessage)
    return validator.validate_python(as_dict)


def comments_to_api_msg(comments: Comments) -> CommentsMessage:
    data = asdict(comments)
    data["constraint_breaches"] = [
        constraint_breach_to_api_msg(cb) for cb in comments.constraint_breaches
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(CommentsMessage)
    return validator.validate_python(as_dict)


def assignment_to_api_msg(assignment: Assignment) -> AssignmentMessage:
    data = asdict(assignment)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AssignmentMessage)
    return validator.validate_python(as_dict)


def schedule_and_assignments_to_api_msg(
    schedule: Schedule, assignments: List[Assignment]
) -> ScheduleMessage:
    data = asdict(schedule)
    data["assignments"] = [assignment_to_api_msg(a) for a in assignments]
    data["comments"] = comments_to_api_msg(schedule.comments)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ScheduleMessage)
    return validator.validate_python(as_dict)


def api_msg_to_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {k: v for k, v in data_snake.items() if k != "assignments"}
    return Schedule(**data_snake)


# pylint: disable=R0801
def api_msg_to_schedule_options(
    msg: ScheduleOptionsMessage,
) -> ScheduleOptions:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_date"] = datetime.combine(
        data_snake["start_date"], datetime.min.time()
    )
    data_snake["end_date"] = datetime.combine(
        data_snake["end_date"], datetime.min.time()
    )
    return ScheduleOptions(**data_snake)
