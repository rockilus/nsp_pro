from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.assignment_service import get_assignment_service
from src.dependencies.database import get_db_collections
from src.services.assignment_service import AssignmentService
from src.services.request_service import RequestService


def get_request_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
    assignment_service: AssignmentService = Depends(get_assignment_service),
) -> RequestService:
    return RequestService(
        collection=db_collections, assignment_service=assignment_service
    )
