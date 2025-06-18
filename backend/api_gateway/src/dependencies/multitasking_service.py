from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.multitasking_service import MultitaskingService


def get_multitasking_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> MultitaskingService:
    return MultitaskingService(db_collections)
