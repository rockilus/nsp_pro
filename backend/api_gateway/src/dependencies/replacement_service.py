from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.replacement_service import ReplacementService


def get_replacement_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ReplacementService:
    return ReplacementService(db_collections)
