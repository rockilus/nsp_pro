from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.stats_service import StatsService


def get_stats_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> StatsService:
    return StatsService(db_collections)
