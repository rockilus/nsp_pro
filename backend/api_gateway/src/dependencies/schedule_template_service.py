from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.schedule_template_service import (
    ScheduleTemplateService,
)


def get_schedule_template_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ScheduleTemplateService:
    return ScheduleTemplateService(db_collections)
