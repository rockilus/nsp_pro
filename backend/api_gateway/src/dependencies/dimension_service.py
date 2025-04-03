from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import DimensionService


def get_dimension_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DimensionService:
    return DimensionService(db_collections)
