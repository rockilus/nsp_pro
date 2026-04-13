from typing import Dict, List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import LinkShift
from shared.schemas.dto import LinkShiftDTO

from src.dependencies import (
    get_db_collections,
    get_link_shift_service,
    get_user_context,
)
from src.dependencies.cerbos_authz_dependencies import get_cerbos_authz_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization.cerbos_authz_service import (
    CerbosAuthzService,
)
from src.security.user_context import UserContext
from src.services.link_shift_service import LinkShiftService

router = APIRouter()


# pylint: disable=R0801
@router.post("/link-shifts/teams/{team_id}")
async def create_link_shift(
    team_id: str,
    link_shift: LinkShiftDTO,
    user_context: UserContext = Depends(get_user_context),
    link_shift_service: LinkShiftService = Depends(
        get_link_shift_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> LinkShiftDTO:
    try:
        if not await authz.check(
            user_context.user_id,
            "create-link-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a link shift"
            )
        ls_data = LinkShift.from_dto(link_shift)
        link_shift_created = link_shift_service.create_link_shift(ls_data)
        response = link_shift_created.to_dto()
    except Exception as e:
        log_info("Failed to create link_shift")
        handle_routes_errors(e)
    return response


@router.get("/link-shifts/teams/{team_id}")
async def get_link_shifts(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[LinkShiftDTO]:
    try:
        if not await authz.check(
            user_context.user_id,
            "read-link-shifts",
            "team",
            team_id,
        ):
            raise NotAuthorizedError("You do not have permission to get link shifts")
        link_shifts = db_collections.link_shift_db.get_link_shifts(team_id)
        response = [ls.to_dto() for ls in link_shifts]
    except Exception as e:
        log_info("Failed to get link shifts")
        handle_routes_errors(e)
    return response


@router.put("/link-shifts/{link_shift_id}/teams/{team_id}")
async def update_link_shift(
    team_id: str,
    link_shift: LinkShiftDTO,
    user_context: UserContext = Depends(get_user_context),
    link_shift_service: LinkShiftService = Depends(
        get_link_shift_service,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> LinkShiftDTO:
    try:
        if not await authz.check(
            user_context.user_id,
            "update-link-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a link shift"
            )
        ls_data = LinkShift.from_dto(link_shift)
        ls_updated = link_shift_service.update_link_shift(ls_data)
        response = ls_updated.to_dto()
    except Exception as e:
        log_info("Failed to update link shift")
        handle_routes_errors(e)
    return response


@router.delete("/link-shifts/{link_shift_id}/teams/{team_id}")
async def delete_link_shift(
    link_shift_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> Dict:
    try:
        if not await authz.check(
            user_context.user_id,
            "delete-link-shift",
            "team",
            team_id,
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a link shift"
            )
        db_collections.link_shift_db.delete_link_shift(link_shift_id)
    except Exception as e:
        log_info("Failed to delete link shift")
        handle_routes_errors(e)
    return {"message": "LinkShift deleted"}
