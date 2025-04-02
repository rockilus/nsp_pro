from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.dependencies.shift_service import get_shift_service
from src.services import ShiftService, TeamService


def get_team_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    shift_service: ShiftService = Depends(get_shift_service),
) -> TeamService:
    """
    Dependency to provide an instance of TeamService.
    """
    return TeamService(db_collections, shift_service)
