"""Dependency injection for ImportPersistenceService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.import_persistence_service import ImportPersistenceService


def get_import_persistence_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ImportPersistenceService:
    """Return an ImportPersistenceService instance wired to the database."""
    return ImportPersistenceService(db_collections)
