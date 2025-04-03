from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.data_fetching_service import DataFetchingService


def get_data_fetching_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DataFetchingService:
    return DataFetchingService(db_collections)
