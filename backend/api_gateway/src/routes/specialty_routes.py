from typing import List

from fastapi import APIRouter, Depends, HTTPException
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import Specialty
from shared.schemas.dto import SpecialtyDTO, WorkerDTO

from src.dependencies import (
    get_db_collections,
    get_specialty_service,
    get_user_context,
)
from src.errors import (
    NotAuthorizedError,
    handle_routes_errors,
)
from src.integrations.authorization import authz_check
from src.security.user_context import UserContext
from src.services.specialty_service import SpecialtyService

router = APIRouter()


@router.post("/specialties/teams/{team_id}")
async def create_specialty(
    team_id: str,
    specialty: SpecialtyDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> SpecialtyDTO:
    try:
        if not await authz_check(
            user_context.user_id, "create-specialty", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a specialty")
        s_data = Specialty.from_dto(specialty)
        de_created = db_collections.specialty_db.create_specialty(s_data)
        response = de_created.to_dto()
    except Exception as e:
        log_info("Failed to create specialty")
        handle_routes_errors(e)
    return response


# pylint: disable=R0801
@router.get("/specialties/teams/{team_id}")
async def get_specialties(
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[SpecialtyDTO]:
    try:
        if not await authz_check(
            user_context.user_id, "read-specialties", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to read specialties")
        specialties = db_collections.specialty_db.get_specialties_by_team_id(team_id)
        response = [sp.to_dto() for sp in specialties]
    except Exception as e:
        log_info("Failed to get specialties")
        handle_routes_errors(e)
    return response


@router.put("/specialties/{specialty_id}/teams/{team_id}")
async def update_specialty(
    team_id: str,
    specialty: SpecialtyDTO,
    user_context: UserContext = Depends(get_user_context),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> SpecialtyDTO:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            user_context.user_id, "update-specialty", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update a specialty")
        de_data = Specialty.from_dto(specialty)
        updated_de = db_collections.specialty_db.update_specialty(de_data)
        response = updated_de.to_dto()
    except Exception as e:
        log_info("Failed to update specialty")
        handle_routes_errors(e)
    return response


@router.delete("/specialties/{specialty_id}/teams/{team_id}")
async def delete_specialty(
    specialty_id: str,
    team_id: str,
    user_context: UserContext = Depends(get_user_context),
    specialty_service: SpecialtyService = Depends(get_specialty_service),
) -> List[WorkerDTO]:
    # pylint: disable=R0801
    try:
        if not await authz_check(
            user_context.user_id, "delete-specialty", "team", team_id
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to delete a specialty",
            )
        workers_updated, attributes = specialty_service.delete_specialty(specialty_id)
        response = [w.to_dto(attr) for w, attr in zip(workers_updated, attributes)]
    except Exception as e:
        log_info("Failed to delete specialty")
        handle_routes_errors(e)
    return response
