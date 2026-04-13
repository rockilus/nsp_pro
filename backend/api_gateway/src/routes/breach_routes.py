import time as time_module
from typing import Dict, List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Breach
from shared.schemas.dto import BreachDTO

from src.dependencies import get_db_collections, get_user_context
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext

router = APIRouter()


@router.get("/breaches/teams/{team_id}")
async def get_objective_breaches(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[BreachDTO]:
    try:
        if not await authz.check(
            user_context.user_id, "read-breaches", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to get objective breaches",
            )
        start_time = time_module.time()
        schedule_campaign = db_collections.schedule_db.get_schedule_campaign(team_id)
        if not schedule_campaign:
            return []
        breaches = db_collections.breach_db.get_breaches_by_schedule_id(
            schedule_campaign.id
        )
        response = [b.to_dto() for b in breaches]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get breaches: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get objective breaches")
        handle_routes_errors(e)
    return response


@router.put("/breaches/{objective_breach_id}/teams/{team_id}")
async def update_objective_breach(
    team_id: str,
    objective_breach_api: BreachDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> BreachDTO:
    try:
        if not await authz.check(
            user_context.user_id, "update-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update objective breaches",
            )
        breach_data = Breach.from_dto(objective_breach_api)
        updated_breach = db_collections.breach_db.update_breach(breach_data)
        response = updated_breach.to_dto()
    except Exception as e:
        log_info("Failed to update objective breach")
        handle_routes_errors(e)
    return response


@router.delete("/breaches/{objective_breach_id}/teams/{team_id}")
async def delete_objective_breach(
    objective_breach_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> Dict:
    try:
        if not await authz.check(
            user_context.user_id, "delete-breach", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete objective breaches",
            )
        db_collections.breach_db.delete_breach(objective_breach_id)
    except Exception as e:
        log_info("Failed to delete objective breach")
        handle_routes_errors(e)
    return {"message": "ObjectiveBreach deleted"}
