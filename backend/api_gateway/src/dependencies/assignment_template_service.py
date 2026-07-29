from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.assignment_template_service import (
    AssignmentTemplateService,
)


def get_assignment_template_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> AssignmentTemplateService:
    return AssignmentTemplateService(db_collections)
