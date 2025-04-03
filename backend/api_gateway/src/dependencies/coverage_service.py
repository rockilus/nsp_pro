from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.coverage_service import CoverageService


def get_coverage_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> CoverageService:
    return CoverageService(db_collections)
