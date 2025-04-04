from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.request_service import RequestService


def get_request_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> RequestService:
    return RequestService(db_collections)
