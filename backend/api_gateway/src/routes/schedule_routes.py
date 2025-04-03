from dataclasses import asdict
from datetime import datetime, time, timezone
from typing import Dict, List, Tuple

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import (
    Assignment,
    Breach,
    EngineOutputsAugmented,
    QuickStaffing,
    RequestAugmented,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    Shift,
    SolveDetails,
    SolveDetailsStatus,
    WorkTimeTable,
)
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_schedule_service
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
from src.routes.api_model import (
    AssignmentMessage,
    BreachMessage,
    CoverageSelectorMessage,
    QuickStaffingMessage,
    RequestMessage,
    ScheduleMessage,
    ShiftMessage,
    SolutionMessage,
    SolveDetailsMessage,
    WorkTimeTableMessage,
)
from src.routes.assignment_routes import core_to_msg_assignment
from src.routes.breach_routes import core_to_msg_breach
from src.routes.coverage_selector_routes import core_to_msg_coverage_selector
from src.routes.request_routes import core_to_msg_request_augmented
from src.routes.shift_routes import core_to_msg_shift_and_attributes
from src.scripts.setup_database import schedule_db
from src.services import ScheduleService
from src.utils import event_manager

router = APIRouter()


@router.post("/schedules/teams/{team_id}", status_code=201)
async def create_schedule(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a schedule",
            )
        schedules = schedule_db.get_schedules(team_id)
        schedule_wip = schedule_service.get_schedule_campaign(schedules, team_id)
        response = core_to_msg_schedule(schedule_wip)
    except Exception as e:
        log_info("Failed to create schedule")
        handle_routes_errors(e)
    return response


@router.get("/schedules/teams/{team_id}")
async def get_schedules(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ScheduleMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get schedules",
            )
        schedules = db_collections.schedule_db.get_schedules(team_id)
        response = [core_to_msg_schedule(s) for s in schedules]
    except Exception as e:
        log_info("Failed to get schedules")
        handle_routes_errors(e)
    return response


@router.get("/schedules/{schedule_id}/work-time-table/teams/{team_id}")
async def get_work_time_table(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> WorkTimeTableMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read a work time table",
            )
        work_time_table = schedule_service.build_worktime_data(schedule_id)
        response = core_to_msd_work_time_table(work_time_table)
    except Exception as e:
        log_info("Failed to get work time table")
        handle_routes_errors(e)
    return response


@router.post("/schedules/{schedule_id}/solve/teams/{team_id}", status_code=201)
async def solve_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> ScheduleMessage:
    # ) -> SolutionMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "solve-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to solve a schedule",
            )
        schedule = schedule_service.solve_schedule(schedule_id)
        response = core_to_msg_schedule(schedule)
    except Exception as e:
        log_info("Failed to solve schedule")
        handle_routes_errors(e)
    return response


@router.post("/schedules/{schedule_id}/notifify-solved/teams/{team_id}")
async def notify_solved_schedule(schedule_id: str, team_id: str, data: Dict) -> str:
    try:
        if "eo_augmented" not in data:
            raise MessageTypeError("eo_augmented not in data")
        eo_augmented = EngineOutputsAugmented.from_dict(data["eo_augmented"])
        solution_message = core_to_msg_solution(
            eo_augmented.schedule,
            eo_augmented.assignments,
            eo_augmented.breaches,
            eo_augmented.requests,
            eo_augmented.shifts_recup_new,
        )
        # Broadcast the data to all SSE clients
        event_manager.broadcast(solution_message.model_dump())
        print(f"schedule_id notified as solved: {schedule_id}, {team_id}")
    except Exception as e:
        log_info("Failed to notify solved schedule")
        handle_routes_errors(e)
    return "Task ID"


@router.post("/schedules/{schedule_id}/validate/teams/{team_id}", status_code=201)
async def validate_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> ScheduleMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "validate-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to validate a schedule",
            )
        schedule = schedule_service.validate_schedule(schedule_id)
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
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> Tuple[ScheduleMessage, List[CoverageSelectorMessage]]:
    try:
        if not await authz_check(
            session.get_user_id(), "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a schedule",
            )
        schedule_data = msg_to_core_schedule(schedule_api)
        schedule_updated, css_updated = schedule_service.update_schedule(schedule_data)
        response = (
            core_to_msg_schedule(schedule_updated),
            [core_to_msg_coverage_selector(cs) for cs in css_updated],
        )
    except Exception as e:
        log_info("Failed to update schedule")
        handle_routes_errors(e)
    return response


@router.delete("/schedules/{schedule_id}/teams/{team_id}")
async def delete_schedule(
    schedule_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a schedule",
            )
        schedule_service.delete_schedule(schedule_id)
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


def core_to_msg_solve_details(sd: SolveDetails) -> SolveDetailsMessage:
    try:
        data = asdict(sd)
    except Exception as e:
        log_info("Failed to convert SolveDetails to dictionary")
        raise MessageTypeError(str(e)) from e
    data["updated_at"] = sd.updated_at.timestamp()
    as_dict = humps.camelize(data)
    validator = TypeAdapter(SolveDetailsMessage)
    try:
        sd_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert SolveDetails to SolveDetailsMessage")
        handle_message_errors(e)
    return sd_msg


def core_to_msg_schedule(schedule: Schedule) -> ScheduleMessage:
    try:
        data = asdict(schedule)
    except Exception as e:
        log_info("Failed to convert Schedule to dictionary")
        raise MessageTypeError(str(e)) from e
    data["start_date"] = datetime.combine(
        schedule.start_date, time.min, tzinfo=timezone.utc
    ).timestamp()
    data["end_date"] = datetime.combine(
        schedule.end_date, time.min, timezone.utc
    ).timestamp()
    data["last_modified_dates"] = schedule.last_modified_dates.timestamp()
    data["solve_details"] = (
        core_to_msg_solve_details(schedule.solve_details)
        if schedule.solve_details
        else None
    )
    data["missing_coverage_dates"] = [
        datetime.combine(d, time.min, tzinfo=timezone.utc).timestamp()
        for d in schedule.missing_coverage_dates
    ]
    data["quick_staffings"] = [
        core_to_msg_quick_staffing(qs) for qs in schedule.quick_staffings
    ]
    data["last_updated_dsds"] = (
        schedule.last_updated_dsds.timestamp() if schedule.last_updated_dsds else None
    )
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
    shifts_recup_new: List[Shift],
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
    data["breaches"] = [core_to_msg_breach(ob) for ob in objective_breaches]
    data["requests"] = [core_to_msg_request_augmented(r) for r in requests]
    data["shifts_recup_new"] = [
        core_to_msg_shift_and_attributes(s, []) for s in shifts_recup_new
    ]
    as_dict = humps.camelize(data)
    validator = TypeAdapter(SolutionMessage)
    try:
        s_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Solution to SolutionMessage")
        handle_message_errors(e)
    return s_msg


def core_to_msd_work_time_table(wtt: WorkTimeTable) -> WorkTimeTableMessage:
    try:
        data = asdict(wtt)
    except Exception as e:
        log_info("Failed to convert WorkTimeTable to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(WorkTimeTableMessage)
    try:
        wtt_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert WorkTimeTable to WorkTimeTableMessage")
        handle_message_errors(e)
    return wtt_msg


# message to core
def msg_to_core_quick_staffing(msg: QuickStaffingMessage) -> QuickStaffing:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        quick_staffing = QuickStaffing(**data_snake)
    except Exception as e:
        log_info("Failed to convert QuickStaffingMessage to QuickStaffing")
        handle_create_schema_object_error(e)
    return quick_staffing


def msg_to_core_solve_details(msg: SolveDetailsMessage) -> SolveDetails:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["status"] = SolveDetailsStatus(data_snake["status"])
    data_snake["updated_at"] = datetime.fromtimestamp(
        data_snake["updated_at"], timezone.utc
    )
    try:
        solve_details = SolveDetails(**data_snake)
    except Exception as e:
        log_info("Failed to convert SolveDetailsMessage to SolveDetails")
        handle_create_schema_object_error(e)
    return solve_details


def msg_to_core_schedule(msg: ScheduleMessage) -> Schedule:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["start_date"] = datetime.fromtimestamp(
        data_snake["start_date"], timezone.utc
    ).date()
    data_snake["end_date"] = datetime.fromtimestamp(
        data_snake["end_date"], timezone.utc
    ).date()
    data_snake["last_modified_dates"] = datetime.fromtimestamp(
        data_snake["last_modified_dates"], timezone.utc
    )
    if msg.solveDetails:
        data_snake["solve_details"] = msg_to_core_solve_details(msg.solveDetails)
    data_snake["solve_status"] = ScheduleSolveStatus(data_snake["solve_status"])
    data_snake["status"] = ScheduleStatus(data_snake["status"])
    data_snake["missing_coverage_dates"] = [
        datetime.fromtimestamp(d, timezone.utc).date()
        for d in data_snake["missing_coverage_dates"]
    ]
    data_snake["quick_staffings"] = [
        msg_to_core_quick_staffing(qs) for qs in msg.quickStaffings
    ]
    if msg.lastUpdatedDsds:
        data_snake["last_updated_dsds"] = datetime.fromtimestamp(
            data_snake["last_updated_dsds"], timezone.utc
        )
    try:
        schedule = Schedule(**data_snake)
    except Exception as e:
        log_info("Failed to convert ScheduleMessage to Schedule")
        handle_create_schema_object_error(e)
    return schedule
