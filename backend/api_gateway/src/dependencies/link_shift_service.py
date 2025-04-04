from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.link_shift_service import LinkShiftService


def get_link_shift_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> LinkShiftService:
    return LinkShiftService(db_collections)
