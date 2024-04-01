from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.schedule import Assignment, ObjectiveBreach, Schedule, Stat
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import (
    AssignmentMessage,
    ObjectiveBreachMessage,
    ScheduleMessage,
    SolutionMessage,
    StatMessage,
    ValidateMessage,
)
from routes.assignment_routes import assignment_to_api_msg
from routes.objective_breach_routes import objective_breach_to_api_msg
from routes.stats_options_routes import stat_to_api_msg
from scripts.setup_database import (
    assignment_db,
    constraint_db,
    objective_breach_db,
    schedule_db,
)
from services.schedule_services import solve_schedule as solve_schedule_service
from services.schedule_services import (
    to_past_schedules_and_assignments as to_past_schedules_and_assignments_service,
)
from services.schedule_services import validate_schedule as validate_schedule_service

router = APIRouter()


@router.post("/schedules/teams/{team_id}", status_code=201)
async def create_schedule(
    team_id: str,
    schedule: ScheduleMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ScheduleMessage:
    if not await authz_check(session.get_user_id(), "create-schedule", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a schedule",
        )
    s_data = api_msg_to_schedule(schedule)
    s_created = schedule_db.create_schedule(s_data)
    return schedule_to_api_msg(s_created)


@router.post("/schedules/{schedule_id}/solve/teams/{team_id}", status_code=201)
async def solve_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> SolutionMessage:
    if not await authz_check(session.get_user_id(), "solve-schedule", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to solve a schedule",
        )
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    schedule, assignments, objective_breaches, stats = solve_schedule_service(schedule)
    return solution_to_api_msg(schedule, assignments, objective_breaches, stats)


@router.post("/schedules/{schedule_id}/validate/teams/{team_id}", status_code=201)
async def validate_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ValidateMessage:
    if not await authz_check(
        session.get_user_id(), "validate-schedule", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to validate a schedule",
        )
    schedule, assignments = validate_schedule_service(schedule_id)
    return validate_to_api_msg(schedule, assignments)


@router.get("/schedules/teams/{team_id}")
async def get_schedules(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ScheduleMessage]:
    if not await authz_check(session.get_user_id(), "read-schedules", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get schedules",
        )
    to_past_schedules_and_assignments_service(team_id)
    schedules = schedule_db.get_schedules(team_id)
    return [schedule_to_api_msg(s) for s in schedules]


@router.put("/schedules/{schedule_id}/teams/{team_id}")
async def update_schedule(
    schedule_id: str,
    team_id: str,
    schedule_api: ScheduleMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ScheduleMessage:
    if not await authz_check(session.get_user_id(), "update-schedule", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a schedule",
        )
    existing_schedule = schedule_db.get_schedule_by_id(schedule_id)
    if not existing_schedule:
        raise HTTPException(status_code=404, detail="Schedule does not exist")
    schedule_data = api_msg_to_schedule(schedule_api)
    updated_schedule = schedule_db.update_schedule(schedule_data)
    return schedule_to_api_msg(updated_schedule)


@router.delete("/schedules/{schedule_id}/teams/{team_id}")
async def delete_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    if not await authz_check(session.get_user_id(), "delete-schedule", "team", team_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a schedule",
        )
    assignment_db.delete_assignments_by_schedule_id(schedule_id)
    objective_breach_db.delete_objective_breaches_by_schedule_id(schedule_id)
    constraint_db.delete_constraints_by_schedule_id(schedule_id)
    schedule_db.delete_schedule(schedule_id)
    return {"message": "Schedule deleted"}


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
        ScheduleMessage
        | List[AssignmentMessage]
        | List[ObjectiveBreachMessage]
        | List[StatMessage],
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


def validate_to_api_msg(
    schedule: Schedule,
    assignments: List[Assignment],
) -> ValidateMessage:
    data: Dict[str, ScheduleMessage | List[AssignmentMessage]] = {}
    data["schedule"] = schedule_to_api_msg(schedule)
    data["assignments"] = [assignment_to_api_msg(a) for a in assignments]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ValidateMessage)
    return validator.validate_python(as_dict)


def api_msg_to_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake = {
        k: v
        for k, v in data_snake.items()
        if k not in ["assignments", "objective_breaches", "stats"]
    }
    return Schedule(**data_snake)
