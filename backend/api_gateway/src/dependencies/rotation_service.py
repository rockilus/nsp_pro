from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.rotation_service import RotationService


def get_rotation_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> RotationService:
    return RotationService(db_collections)
