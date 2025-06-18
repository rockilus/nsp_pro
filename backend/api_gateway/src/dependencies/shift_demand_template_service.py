from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)


def get_shift_demand_template_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ShiftDemandTemplateService:
    return ShiftDemandTemplateService(db_collections)
