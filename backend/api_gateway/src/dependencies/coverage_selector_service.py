from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import CoverageSelectorService


def get_coverage_selector_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> CoverageSelectorService:
    return CoverageSelectorService(db_collections)
