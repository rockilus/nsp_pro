from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import (
    Dimension,
    DimensionAndDimEntries,
    DimensionType,
    DimEntry,
)
from shared.schemas.dto import (
    DimensionDTO,
    DimensionsAndDimEntriesDTO,
    DimEntryDTO,
    NewDimensionDTO,
)

from src.dependencies import get_db_collections, get_dimension_service
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.dimension_service import DimensionService

router = APIRouter()


@router.post("/dimensions/teams/{team_id}")
async def create_dimension(
    team_id: str,
    dimension: DimensionDTO,
    dim_entries: List[DimEntryDTO],
    session: SessionContainerType = Depends(authn_verify_session()),
    dimension_service: DimensionService = Depends(
        get_dimension_service,
    ),
) -> NewDimensionDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "create-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a dimension")
        d_data = Dimension.from_dto(dimension)
        des_data = [DimEntry.from_dto(de) for de in dim_entries]
        new_dimension = dimension_service.create_dimension(d_data, des_data)
        response = new_dimension.to_dto()
    except Exception as e:
        log_info("Failed to create dimension")
        handle_routes_errors(e)
    return response


@router.get("/dimensions/teams/{team_id}")
async def get_dimensions(
    team_id: str,
    dim_types_query: List[str] = Query(None, alias="dim_types"),
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
) -> DimensionsAndDimEntriesDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "read-dimensions", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to read shift dimensions"
            )
        if dim_types_query is None:
            dt_data = list(DimensionType)
        else:
            dim_types_int = [
                int(dt) for dtq in dim_types_query for dt in dtq.split(",")
            ]
            dt_data = [DimensionType(dt) for dt in dim_types_int]
        dimensions = (
            db_collections.dimension_db.get_dimensions_by_dim_types_not_deleted(
                dt_data, team_id
            )
        )
        dim_entries = db_collections.dim_entry_db.get_dim_entries_by_dim_ids(
            [d.id for d in dimensions]
        )
        response = DimensionAndDimEntries(
            dimensions=dimensions,
            dim_entries=dim_entries,
        ).to_dto()
    except Exception as e:
        log_info("Failed to get dimensions")
        handle_routes_errors(e)
    return response


@router.put("/dimensions/{dimension_id}/teams/{team_id}")
async def update_dimension(
    team_id: str,
    dimension: DimensionDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(
        get_db_collections,
    ),
) -> DimensionDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "update-dimension", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a dimension")
        d_data = Dimension.from_dto(dimension)
        updated_dimension = db_collections.dimension_db.update_dimension(d_data)
        response = updated_dimension.to_dto()
    except Exception as e:
        log_info("Failed to update dimension")
        handle_routes_errors(e)
    return response


@router.delete("/dimensions/{dimension_id}/teams/{team_id}")
async def delete_dimension(
    dimension_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    dimension_service: DimensionService = Depends(
        get_dimension_service,
    ),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-dimension", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a dimension",
            )
        dimension_service.delete_dimension(dimension_id)
    except Exception as e:
        log_info("Failed to delete dimension")
        handle_routes_errors(e)
    return {"message": "dimension deleted"}
