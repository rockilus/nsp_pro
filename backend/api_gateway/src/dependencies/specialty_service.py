from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import SpecialtyService


def get_specialty_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> SpecialtyService:
    return SpecialtyService(db_collections)
