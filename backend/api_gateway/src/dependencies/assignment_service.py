from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.assignment_service import AssignmentService


def get_assignment_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> AssignmentService:
    return AssignmentService(db_collections)
