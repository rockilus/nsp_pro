from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import (
    Assignment,
    Breach,
    EngineOutputs,
    QuickStaffing,
    RequestAugmented,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    Shift,
)
from shared.schemas.errors import handle_create_schema_object_error

from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from routes.api_model import (
    AssignmentMessage,
    BreachMessage,
    QuickStaffingMessage,
    RequestMessage,
    ScheduleMessage,
    ShiftMessage,
    SolutionMessage,
)
from routes.assignment_routes import core_to_msg_assignment
from routes.breach_routes import core_to_msg_objective_breach
from routes.request_routes import core_to_msg_request_augmented
from routes.shift_routes import core_to_msg_shift_and_attributes
from scripts.setup_database import assignment_db, breach_db, schedule_db
from services.schedule_services import solve_schedule as solve_schedule_service
from services.schedule_services import validate_schedule as validate_schedule_service
from services.schedule_services.get_schedule_wip import get_schedule_campaign

router = APIRouter()


@router.post("/schedules/teams/{team_id}", status_code=201)
async def create_schedule(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ScheduleMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a schedule",
            )
        schedules = schedule_db.get_schedules(team_id)
        schedule_wip = get_schedule_campaign(schedules, team_id)
        response = core_to_msg_schedule(schedule_wip)
    except Exception as e:
        log_info("Failed to create schedule")
        handle_routes_errors(e)
    return response


@router.get("/schedules/teams/{team_id}")
async def get_schedules(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ScheduleMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get schedules",
            )
        schedules = schedule_db.get_schedules(team_id)
        response = [core_to_msg_schedule(s) for s in schedules]
    except Exception as e:
        log_info("Failed to get schedules")
        handle_routes_errors(e)
    return response


@router.post("/schedules/{schedule_id}/solve/teams/{team_id}", status_code=201)
async def solve_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> str:
    # ) -> SolutionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "solve-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to solve a schedule",
            )
        schedule = schedule_db.get_schedule_by_id(schedule_id)
        task_id = solve_schedule_service(schedule)
        # response = core_to_msg_solution(
        #     schedule,
        #     assignments,
        #     objective_breaches,
        #     requests,
        #     recuperation_shifts_new,
        # )
        # response = solve_schedule_service(schedule)
    except Exception as e:
        log_info("Failed to solve schedule")
        handle_routes_errors(e)
    return task_id


@router.post("/schedules/{schedule_id}/notifify-solved/teams/{team_id}")
async def notify_solved_schedule(schedule_id: str, team_id: str, data: Dict) -> str:
    try:
        if "engine_outputs" not in data:
            raise MessageTypeError("engine_outputs not in data")
        engine_outputs = EngineOutputs.from_dict(data["engine_outputs"])
        print(f"schedule_id notified as solved: {schedule_id}, {team_id}")
        print(f"engine_outputs: {engine_outputs}")
    except Exception as e:
        log_info("Failed to notify solved schedule")
        handle_routes_errors(e)
    return "Task ID"


@router.post("/schedules/{schedule_id}/validate/teams/{team_id}", status_code=201)
async def validate_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ScheduleMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "validate-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to validate a schedule",
            )
        schedule = validate_schedule_service(schedule_id)
        response = core_to_msg_schedule(schedule)
    except Exception as e:
        log_info("Failed to validate schedule")
        handle_routes_errors(e)
    return response


@router.put("/schedules/{schedule_id}/teams/{team_id}")
async def update_schedule(
    team_id: str,
    schedule_api: ScheduleMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ScheduleMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a schedule",
            )
        schedule_data = msg_to_core_schedule(schedule_api)
        updated_schedule = schedule_db.update_schedule(schedule_data)
        response = core_to_msg_schedule(updated_schedule)
    except Exception as e:
        log_info("Failed to update schedule")
        handle_routes_errors(e)
    return response


@router.delete("/schedules/{schedule_id}/teams/{team_id}")
async def delete_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a schedule",
            )
        assignment_db.delete_assignments_by_schedule_id(schedule_id)
        breach_db.delete_breaches_by_schedule_id(schedule_id)
        schedule_db.delete_schedule(schedule_id)
    except Exception as e:
        log_info("Failed to delete schedule")
        handle_routes_errors(e)
    return {"message": "Schedule deleted"}


# Mappers
# core to message
def core_to_msg_quick_staffing(qs: QuickStaffing) -> QuickStaffingMessage:
    try:
        data = asdict(qs)
    except Exception as e:
        log_info("Failed to convert QuickStaffing to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(QuickStaffingMessage)
    try:
        qs_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert QuickStaffing to QuickStaffingMessage")
        handle_message_errors(e)
    return qs_msg


def core_to_msg_schedule(schedule: Schedule) -> ScheduleMessage:
    try:
        data = asdict(schedule)
    except Exception as e:
        log_info("Failed to convert Schedule to dictionary")
        raise MessageTypeError(str(e)) from e
    data["quick_staffings"] = [
        core_to_msg_quick_staffing(qs) for qs in schedule.quick_staffings
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ScheduleMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Schedule to ScheduleMessage")
        handle_message_errors(e)
    return s_msg


def core_to_msg_solution(
    schedule: Schedule,
    assignments: List[Assignment],
    objective_breaches: List[Breach],
    requests: List[RequestAugmented],
    recuperation_shifts_new: List[Shift],
) -> SolutionMessage:
    data: Dict[
        str,
        ScheduleMessage
        | List[AssignmentMessage]
        | List[BreachMessage]
        | List[RequestMessage]
        | List[ShiftMessage],
    ] = {}
    data["schedule"] = core_to_msg_schedule(schedule)
    data["assignments"] = [core_to_msg_assignment(a) for a in assignments]
    data["objective_breaches"] = [
        core_to_msg_objective_breach(ob) for ob in objective_breaches
    ]
    data["requests"] = [core_to_msg_request_augmented(r) for r in requests]
    data["recuperation_shifts_new"] = [
        core_to_msg_shift_and_attributes(s, []) for s in recuperation_shifts_new
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(SolutionMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Solution to SolutionMessage")
        handle_message_errors(e)
    return s_msg


# message to core
def msg_to_core_quick_staffing(msg: QuickStaffingMessage) -> QuickStaffing:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        quick_staffing = QuickStaffing(**data_snake)
    except Exception as e:
        log_info("Failed to convert QuickStaffingMessage to QuickStaffing")
        handle_create_schema_object_error(e)
    return quick_staffing


def msg_to_core_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["solve_status"] = ScheduleSolveStatus(data_snake["solve_status"])
    data_snake["status"] = ScheduleStatus(data_snake["status"])
    data_snake["quick_staffings"] = [
        msg_to_core_quick_staffing(qs) for qs in msg.quickStaffings
    ]
    try:
        schedule = Schedule(**data_snake)
    except Exception as e:
        log_info("Failed to convert ScheduleMessage to Schedule")
        handle_create_schema_object_error(e)
    return schedule
