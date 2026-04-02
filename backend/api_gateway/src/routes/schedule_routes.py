from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import DuplicateRequest, Schedule, ScheduleStatus
from shared.schemas.dto import (
    DuplicateRequestDTO,
    DuplicateResultDTO,
    ScheduleDTO,
    WorkTimeTableDTO,
)

from src.dependencies import (
    get_db_collections,
    get_schedule_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.schedule_service import ScheduleService

router = APIRouter()


class SetDeadlineBody(BaseModel):
    deadline: float


class RequestDeadlineDTO(BaseModel):
    deadlineDate: Optional[float] = None


@router.post("/schedules/teams/{team_id}", status_code=201)
async def create_schedule(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a schedule",
            )
        schedule_wip = schedule_service.get_schedule_campaign(
            team_id=team_id, user_id=user_context.effective_user_id
        )
        response = schedule_wip.to_dto()
    except Exception as e:
        log_info("Failed to create schedule")
        handle_routes_errors(e)
    return response


@router.get("/schedules/teams/{team_id}")
async def get_schedules(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ScheduleDTO]:
    try:
        if not await authz_check(
            user_context.user_id, "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get schedules",
            )
        schedules = db_collections.schedule_db.get_schedules(team_id)
        response = [s.to_dto() for s in schedules]
    except Exception as e:
        log_info("Failed to get schedules")
        handle_routes_errors(e)
    return response


@router.get("/schedules/{schedule_id}/work-time-table/teams/{team_id}")
async def get_work_time_table(
    schedule_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> WorkTimeTableDTO:
    try:
        if not await authz_check(
            user_context.user_id, "read-schedule-work-times", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read a work time table",
            )
        work_time_table = schedule_service.build_worktime_data(schedule_id)
        response = work_time_table.to_dto()
    except Exception as e:
        log_info("Failed to get work time table")
        handle_routes_errors(e)
    return response


@router.post("/schedules/{schedule_id}/duplicate-period/teams/{team_id}")
async def duplicate_period(
    schedule_id: str,
    team_id: str,
    duplicate_request: DuplicateRequestDTO,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> DuplicateResultDTO:
    try:
        if not await authz_check(
            user_context.user_id,
            "duplicate-period",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to duplicate a period",
            )
        duplicate_data = DuplicateRequest.from_dto(duplicate_request)
        duplicate_result = schedule_service.duplicate_period(
            schedule_id=schedule_id, duplicate=duplicate_data
        )
        response = duplicate_result.to_dto()
    except Exception as e:
        log_info("Failed to duplicate period")
        handle_routes_errors(e)
    return response


@router.post(
    "/schedules/{schedule_id}/validate/teams/{team_id}", status_code=201
)
async def validate_schedule(
    schedule_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "validate-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to validate a schedule",
            )
        schedule = await schedule_service.validate_schedule(schedule_id)
        response = schedule.to_dto()
    except Exception as e:
        log_info("Failed to validate schedule")
        handle_routes_errors(e)
    return response


@router.put("/schedules/{schedule_id}/teams/{team_id}")
async def update_schedule(
    team_id: str,
    schedule_api: ScheduleDTO,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a schedule",
            )
        schedule_data = Schedule.from_dto(schedule_api)
        schedule_updated = schedule_service.update_schedule(schedule_data)
        response = schedule_updated.to_dto()
    except Exception as e:
        log_info("Failed to update schedule")
        handle_routes_errors(e)
    return response


@router.delete("/schedules/{schedule_id}/teams/{team_id}")
async def delete_schedule(
    schedule_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(
        get_schedule_service,
    ),
) -> Dict:
    try:
        if not await authz_check(
            user_context.user_id, "delete-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a schedule",
            )
        schedule_service.delete_schedule(schedule_id)
    except Exception as e:
        log_info("Failed to delete schedule")
        handle_routes_errors(e)
    return {"message": "Schedule deleted"}


@router.get("/schedules/teams/{team_id}/request-deadline")
async def get_request_deadline(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> RequestDeadlineDTO:
    try:
        if not await authz_check(
            user_context.user_id, "read-requests", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read the request deadline",
            )
        schedules = db_collections.schedule_db.get_schedules(team_id)

        campaign = next(
            (s for s in schedules if s.status == ScheduleStatus.CAMPAIGN), None
        )
        if campaign is None or campaign.request_deadline is None:
            return RequestDeadlineDTO(deadlineDate=None)
        # `request_deadline` is a timezone-aware datetime in UTC
        deadline_ts = campaign.request_deadline.timestamp()
        response = RequestDeadlineDTO(deadlineDate=deadline_ts)
    except Exception as e:
        log_info("Failed to get request deadline")
        handle_routes_errors(e)
    return response


@router.post(
    "/schedules/{schedule_id}/request-deadline/teams/{team_id}",
    status_code=201,
)
async def set_request_deadline(
    schedule_id: str,
    team_id: str,
    body: SetDeadlineBody,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to set the request deadline",
            )
        # Interpret incoming epoch (seconds) as UTC datetime
        deadline_date = datetime.fromtimestamp(body.deadline, tz=timezone.utc)
        schedule = await schedule_service.set_request_deadline(
            schedule_id=schedule_id, deadline_date=deadline_date
        )
        response = schedule.to_dto()
    except Exception as e:
        log_info("Failed to set request deadline")
        handle_routes_errors(e)
    return response


@router.post(
    "/schedules/{schedule_id}/request-deadline/reminder/teams/{team_id}",
    status_code=201,
)
async def send_request_deadline_reminder(
    schedule_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to send a reminder",
            )
        schedule = await schedule_service.send_request_deadline_reminder(
            schedule_id=schedule_id
        )
        response = schedule.to_dto()
    except Exception as e:
        log_info("Failed to send request deadline reminder")
        handle_routes_errors(e)
    return response


@router.put("/schedules/{schedule_id}/request-deadline/teams/{team_id}")
async def edit_request_deadline(
    schedule_id: str,
    team_id: str,
    body: SetDeadlineBody,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to edit the request deadline",
            )
        # Interpret incoming epoch (seconds) as UTC datetime
        new_deadline_date = datetime.fromtimestamp(
            body.deadline, tz=timezone.utc
        )
        # Use edit semantics on the service: allow editing to any future datetime > now
        schedule = await schedule_service.edit_request_deadline(
            schedule_id=schedule_id, new_deadline_date=new_deadline_date
        )
        response = schedule.to_dto()
    except Exception as e:
        log_info("Failed to extend request deadline")
        handle_routes_errors(e)
    return response


@router.delete("/schedules/{schedule_id}/request-deadline/teams/{team_id}")
async def delete_request_deadline(
    schedule_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    schedule_service: ScheduleService = Depends(get_schedule_service),
) -> ScheduleDTO:
    try:
        if not await authz_check(
            user_context.user_id, "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete the request deadline",
            )
        schedule = await schedule_service.delete_request_deadline(
            schedule_id=schedule_id
        )
        response = schedule.to_dto()
    except Exception as e:
        log_info("Failed to delete request deadline")
        handle_routes_errors(e)
    return response
