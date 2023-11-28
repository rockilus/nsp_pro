from dataclasses import asdict
from typing import Dict, List, Union

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.schedule import Assignment, ObjectiveBreach, Schedule, Stat
from routes.api_model import (
    AssignmentMessage,
    ObjectiveBreachMessage,
    ScheduleMessage,
    SolutionMessage,
    StatMessage,
)
from routes.assignment_routes import assignment_to_api_msg
from routes.objective_breach_routes import objective_breach_to_api_msg
from scripts.setup_database import assignment_db, objective_breach_db, schedule_db
from services import solve_schedule as solve_schedule_service

router = APIRouter()


@router.post("/schedules", status_code=201)
def create_schedule(req: ScheduleMessage) -> ScheduleMessage:
    s_data = api_msg_to_schedule(req)
    schedule = schedule_db.create_schedule(s_data)
    return schedule_to_api_msg(schedule)


@router.post("/schedules/{schedule_id}/solve", status_code=201)
def solve_schedule(schedule_id: str) -> SolutionMessage:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    schedule, assignments, objective_breaches, stats = solve_schedule_service(schedule)
    return solution_to_api_msg(schedule, assignments, objective_breaches, stats)


@router.get("/schedules")
def get_schedules() -> List[ScheduleMessage]:
    schedules = schedule_db.get_schedules()
    return [schedule_to_api_msg(s) for s in schedules]


@router.put("/schedules/{schedule_id}")
def update_schedule(schedule_id: str, schedule_api: ScheduleMessage) -> ScheduleMessage:
    existing_schedule = schedule_db.get_schedule_by_id(schedule_id)
    if not existing_schedule:
        raise HTTPException(status_code=404, detail="Schedule does not exist")
    schedule_data = api_msg_to_schedule(schedule_api)
    updated_schedule = schedule_db.update_schedule(schedule_data)
    return schedule_to_api_msg(updated_schedule)


@router.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: str) -> Dict:
    assignment_db.delete_assignments_by_schedule_id(schedule_id)
    objective_breach_db.delete_objective_breaches_by_schedule_id(schedule_id)
    schedule_db.delete_schedule(schedule_id)
    return {"message": "CoverageSelector deleted"}


# def objective_breach_to_api_msg(
#     objective_breach: ObjectiveBreach,
# ) -> ObjectiveBreachMessage:
#     data = asdict(objective_breach)
#     as_dict = humps.camelize(data)
#     validator = TypeAdapter(ObjectiveBreachMessage)
#     return validator.validate_python(as_dict)


# def assignment_to_api_msg(assignment: Assignment) -> AssignmentMessage:
#     data = asdict(assignment)
#     as_dict = humps.camelize(data)
#     validator = TypeAdapter(AssignmentMessage)
#     return validator.validate_python(as_dict)


def stat_to_api_msg(stat: Stat) -> StatMessage:
    data = asdict(stat)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(StatMessage)
    return validator.validate_python(as_dict)


def schedule_to_api_msg(schedule: Schedule) -> ScheduleMessage:
    data = asdict(schedule)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ScheduleMessage)
    return validator.validate_python(as_dict)


def solution_to_api_msg(
    schedule: Schedule,
    assignments: List[Assignment],
    objective_breaches: List[ObjectiveBreach],
    stats: List[Stat],
) -> SolutionMessage:
    data: Dict[
        str,
        Union[
            ScheduleMessage,
            List[AssignmentMessage],
            List[ObjectiveBreachMessage],
            List[StatMessage],
        ],
    ] = {}
    data["schedule"] = schedule_to_api_msg(schedule)
    data["assignments"] = [assignment_to_api_msg(a) for a in assignments]
    data["objective_breaches"] = [
        objective_breach_to_api_msg(ob) for ob in objective_breaches
    ]
    data["stats"] = [stat_to_api_msg(s) for s in stats]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(SolutionMessage)
    return validator.validate_python(as_dict)


def api_msg_to_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {
        k: v
        for k, v in data_snake.items()
        if k not in ["assignments", "objective_breaches", "stats"]
    }
    return Schedule(**data_snake)
