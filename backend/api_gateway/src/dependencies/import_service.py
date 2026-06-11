"""Dependency injection for ImportService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.import_service import ImportService


def get_import_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ImportService:
    """Return an ImportService instance wired to the current database."""
    return ImportService(db_collections)
