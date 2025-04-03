from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.worker_service import WorkerService


def get_worker_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> WorkerService:
    return WorkerService(db_collections)
