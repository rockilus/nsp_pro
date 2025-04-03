from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.shift_demand_service import ShiftDemandService


def get_shift_demand_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ShiftDemandService:
    return ShiftDemandService(db_collections)
