from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.attribute_service import AttributeService


def get_attribute_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> AttributeService:
    return AttributeService(db_collections)
