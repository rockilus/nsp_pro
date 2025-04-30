import time as time_module
from typing import Dict, List

from fastapi import APIRouter, Depends
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import LinkShift, Shift
from shared.schemas.dto import ShiftDTO

from src.dependencies import get_db_collections, get_shift_service
from src.errors import NotAuthorizedError, handle_routes_errors
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.link_shift_routes import core_to_msg_link_shift
from src.services.shift_service import ShiftService

router = APIRouter()


@router.post("/shifts/teams/{team_id}", status_code=201)
async def create_shift(
    team_id: str,
    shift: ShiftDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    shift_service: ShiftService = Depends(get_shift_service),
) -> ShiftDTO:
    try:
        if not await authz_check(
            session.get_user_id(), "create-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to create a shift")
        s_data = Shift.from_dto(shift)
        shift_created, a_bool = shift_service.create_shift(s_data)
        response = shift_created.to_dto(a_bool)
    except Exception as e:
        log_info("Failed to create shift")
        handle_routes_errors(e)
    return response


@router.get("/shifts/teams/{team_id}")
async def get_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftDTO]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        shifts = db_collections.shift_db.get_shifts_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [s.to_dto(attr) for s, attr in zip(shifts, attributes)]
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.get("/shifts/work/teams/{team_id}")
async def get_work_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftDTO]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        shifts = db_collections.shift_db.get_work_shifts_not_deleted(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [s.to_dto(attr) for s, attr in zip(shifts, attributes)]
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.get("/shifts/all/teams/{team_id}")
async def get_all_shifts(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> List[ShiftDTO]:
    try:
        if not await authz_check(session.get_user_id(), "read-shifts", "team", team_id):
            raise NotAuthorizedError("You do not have permission to read shifts")
        start_time = time_module.time()
        shifts = db_collections.shift_db.get_shifts(team_id)
        attributes = [
            db_collections.attribute_db.get_attributes_by_owner_id(shift.id)
            for shift in shifts
        ]
        response = [s.to_dto(attr) for s, attr in zip(shifts, attributes)]
        end_time = time_module.time()
        time_taken = round(end_time - start_time)
        print(f"Time taken to get shifts: {time_taken} seconds")
    except Exception as e:
        log_info("Failed to get shifts")
        handle_routes_errors(e)
    return response


@router.put("/shifts/{shift_id}/teams/{team_id}")
async def update_shift(
    team_id: str,
    shift: ShiftDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
    shift_service: ShiftService = Depends(get_shift_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update shifts")
        shift_data = Shift.from_dto(shift)
        updated_shift, ls_change = shift_service.update_shift(shift_data)
        attributes = db_collections.attribute_db.get_attributes_by_owner_id(
            updated_shift.id
        )
        response = {
            "shift": updated_shift.to_dto(attributes),
            "linkShifts": core_to_msg_ls_change(ls_change),
        }
    except Exception as e:
        log_info("Failed to update shift")
        handle_routes_errors(e)
    return response


@router.delete("/shifts/{shift_id}/teams/{team_id}")
async def delete_shift(
    shift_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    shift_service: ShiftService = Depends(get_shift_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "delete-shift", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to delete shifts")
        ls_change = shift_service.delete_shift(shift_id)
    except Exception as e:
        log_info("Failed to delete shift")
        handle_routes_errors(e)
    return {
        "message": "shift deleted",
        "linkShifts": core_to_msg_ls_change(ls_change),
    }


# Mappers
def core_to_msg_ls_change(
    ls_change: Dict[str, List[LinkShift | str]] | None,
) -> Dict:
    if ls_change is None:
        return {"udpated": [], "deleted": []}
    return {
        "updated": [
            core_to_msg_link_shift(ls)
            for ls in ls_change.get("updated", [])
            if isinstance(ls, LinkShift)
        ],
        "deleted": ls_change.get("deleted", []),
    }
