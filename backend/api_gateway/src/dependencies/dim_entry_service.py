from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import DimEntryService


def get_dim_entry_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DimEntryService:
    return DimEntryService(db_collections)
