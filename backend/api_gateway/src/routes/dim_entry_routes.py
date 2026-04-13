from typing import List

from fastapi import APIRouter, Depends, HTTPException
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import DimEntry
from shared.schemas.dto import AttributeDTO, DimEntryDTO

from src.dependencies import (
    get_db_collections,
    get_dim_entry_service,
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
from src.services.dim_entry_service import DimEntryService

router = APIRouter()


@router.post("/dim-entries/teams/{team_id}")
async def create_dim_entry(
    team_id: str,
    dim_entry: DimEntryDTO,
    user_context: UserContext = Depends(get_user_context),
    dim_entry_service: DimEntryService = Depends(get_dim_entry_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> DimEntryDTO:
    try:
        if not await authz.check(
            user_context.user_id, "create-dim-entry", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a dim entry")
        de_data = DimEntry.from_dto(dim_entry)
        de_created = dim_entry_service.create_dim_entry(de_data)
        response = de_created.to_dto()
    except Exception as e:
        log_info("Failed to create dim entry")
        handle_routes_errors(e)
    return response


@router.put("/dim-entries/{dim_entry_id}/teams/{team_id}")
async def update_dim_entry(
    team_id: str,
    dim_entry: DimEntryDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> DimEntryDTO:
    # pylint: disable=R0801
    try:
        if not await authz.check(
            user_context.user_id, "update-dim-entry", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a dim_entry")
        de_data = DimEntry.from_dto(dim_entry)
        updated_de = db_collections.dim_entry_db.update_dim_entry(de_data)
        response = updated_de.to_dto()
    except Exception as e:
        log_info("Failed to update dim entry")
        handle_routes_errors(e)
    return response


@router.delete("/dim-entries/{dim_entry_id}/teams/{team_id}")
async def delete_dim_entry(
    dim_entry_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    dim_entry_service: DimEntryService = Depends(get_dim_entry_service),
    authz: CerbosAuthzService = Depends(get_cerbos_authz_service),
) -> List[AttributeDTO]:
    # pylint: disable=R0801
    try:
        if not await authz.check(
            user_context.user_id, "delete-dim-entry", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a dim entry",
            )
        attr_updated = dim_entry_service.delete_dim_entry(dim_entry_id)
    except Exception as e:
        log_info("Failed to delete dim entry")
        handle_routes_errors(e)
    return [attr.to_dto() for attr in attr_updated]
