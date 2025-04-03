from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services import DailyShiftDemandService


def get_daily_shift_demand_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> DailyShiftDemandService:
    return DailyShiftDemandService(db_collections)
