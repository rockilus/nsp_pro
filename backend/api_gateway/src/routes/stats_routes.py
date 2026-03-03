import time
from typing import Dict, List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import (
    StatsHeader,
    StatsOptions,
)
from shared.schemas.dto import (
    ShiftWorkerOptionDTO,
    StatsDTO,
    StatsHeaderDTO,
    StatsOptionsDTO,
)

from src.dependencies import (
    get_db_collections,
    get_stats_service,
    get_user_context,
)
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.stats_service import StatsService

router = APIRouter()


@router.post("/stats/stats-headers/teams/{team_id}", status_code=201)
async def create_stats_header(
    team_id: str,
    req: StatsHeaderDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> StatsHeaderDTO:
    try:
        if not await authz_check(
            user_context.user_id, "create-stats-header", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a stats header",
            )
        sh_data = StatsHeader.from_dto(req)
        stats_header = db_collections.stats_header_db.create_stats_header(
            sh_data
        )
        # stats = build_stats(team_id)
        response = stats_header.to_dto()
    except Exception as e:
        log_info("Failed to create stats header")
        handle_routes_errors(e)
    return response


@router.get("/stats/shift-options/teams/{team_id}")
async def get_shift_options(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    stats_service: StatsService = Depends(get_stats_service),
) -> List[ShiftWorkerOptionDTO]:
    try:
        if not await authz_check(
            user_context.user_id, "read-shift-options", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        shift_options = stats_service.get_shift_options(team_id)
        response = [so.to_dto() for so in shift_options]
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.post("/stats/teams/{team_id}")
async def calculate_stats(
    team_id: str,
    options: StatsOptionsDTO,
    user_context: UserContext = Depends(get_user_context),
    stats_service: StatsService = Depends(get_stats_service),
) -> StatsDTO:
    try:
        if not await authz_check(
            user_context.user_id, "read-stats", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get stats options",
            )
        start_time = time.time()
        stats_options = StatsOptions.from_dto(options)
        stats = stats_service.build_stats(team_id, stats_options)
        response = stats.to_dto()
        end_time = time.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get stats: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get stats options")
        handle_routes_errors(e)
    return response


@router.delete("/stats/stats-headers/{stats_header_id}/teams/{team_id}")
async def delete_stats_header(
    stats_header_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> Dict:
    try:
        if not await authz_check(
            user_context.user_id, "delete-stats-header", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete stats header",
            )
        db_collections.stats_header_db.delete_stats_header(stats_header_id)
    except Exception as e:
        log_info("Failed to delete stats header")
        handle_routes_errors(e)
    return {"message": "StatsHeader deleted"}
