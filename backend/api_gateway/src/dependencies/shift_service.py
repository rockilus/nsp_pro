from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.link_shift_service import get_link_shift_service
from src.services import LinkShiftService, ShiftService


def get_shift_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    link_shift_service: LinkShiftService = Depends(get_link_shift_service),
) -> ShiftService:
    return ShiftService(db_collections, link_shift_service)
