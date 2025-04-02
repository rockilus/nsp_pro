from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import ShiftService


def get_shift_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ShiftService:
    """
    Dependency to provide an instance of ShiftService.
    """
    return ShiftService(db_collections)
