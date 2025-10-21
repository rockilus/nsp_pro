from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.test_service import SolverTestScenariosService


def get_test_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> SolverTestScenariosService:
    return SolverTestScenariosService(db_collections)
