from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.data_fetching_service import get_data_fetching_service
from src.dependencies.database import get_db_collections
from src.services.constraint_build_service import ConstraintBuildService
from src.services.data_fetching_service import DataFetchingService


def get_constraint_build_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    data_fetching_service: DataFetchingService = Depends(
        get_data_fetching_service,
    ),
) -> ConstraintBuildService:
    return ConstraintBuildService(db_collections, data_fetching_service)
