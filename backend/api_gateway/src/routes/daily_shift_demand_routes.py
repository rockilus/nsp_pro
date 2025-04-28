import time as time_module
from typing import List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import DailyShiftDemand, DeleteDailyShiftDemandRequest
from shared.schemas.dto import (
    DailyShiftDemandDTO,
    DeleteDailyShiftDemandRequestDTO,
)

from src.dependencies import get_daily_shift_demand_service, get_db_collections
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.daily_shift_demand_service import DailyShiftDemandService

router = APIRouter()


# pylint: disable=R0801
@router.post("/daily-shift-demands/teams/{team_id}", status_code=201)
async def create_daily_shift_demand(
    team_id: str,
    daily_shift_demand: DailyShiftDemandDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DailyShiftDemandDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "create-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create an daily_shift_demand",
            )
        dsd_data = DailyShiftDemand.from_dto(daily_shift_demand)
        dsd_created = db_collections.daily_shift_demand_db.create_daily_shift_demand(
            dsd_data
        )
        response = dsd_created.to_dto()
    except Exception as e:
        log_info("Failed to create daily_shift_demand")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.get("/daily-shift-demands/teams/{team_id}")
async def get_daily_shift_demands(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    daily_shift_demand_service: DailyShiftDemandService = Depends(
        get_daily_shift_demand_service
    ),
) -> List[DailyShiftDemandDTO]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-schedules", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get daily_shift_demands",
            )
        start_time = time_module.time()
        dsds = daily_shift_demand_service.get_daily_shift_demands(team_id)
        response = [dsd.to_dto() for dsd in dsds]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get dsds: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get daily_shift_demands")
        handle_routes_errors(e)
    return response


@router.put("/daily-shift-demands/{daily_shift_demand_id}/teams/{team_id}")
async def update_daily_shift_demand(
    team_id: str,
    daily_shift_demand: DailyShiftDemandDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DailyShiftDemandDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "update-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update an daily_shift_demand",
            )
        dsd_data = DailyShiftDemand.from_dto(daily_shift_demand)
        updated_dsd = db_collections.daily_shift_demand_db.update_daily_shift_demand(
            dsd_data
        )
        response = updated_dsd.to_dto()
    except Exception as e:
        log_info("Failed to update daily_shift_demand")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.delete("/daily-shift-demands/teams/{team_id}")
async def delete_daily_shift_demands(
    team_id: str,
    delete_daily_shift_demand_request: DeleteDailyShiftDemandRequestDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    daily_shift_demand_service: DailyShiftDemandService = Depends(
        get_daily_shift_demand_service
    ),
) -> List[str]:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-schedule", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete an daily_shift_demand",
            )
        delete_dsd_data = DeleteDailyShiftDemandRequest.from_dto(
            delete_daily_shift_demand_request
        )
        dsd_deleted_ids = daily_shift_demand_service.delete_daily_shift_demands(
            team_id=delete_dsd_data.team_id,
            shift_id=delete_dsd_data.shift_id,
            target_date=delete_dsd_data.date,
        )
        response = dsd_deleted_ids
    except Exception as e:
        log_info("Failed to delete daily_shift_demand")
        handle_routes_errors(e)
    return response
