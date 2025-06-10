from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.shift_demand_new_service import ShiftDemandNewService


def get_shift_demand_new_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ShiftDemandNewService:
    return ShiftDemandNewService(db_collections)
