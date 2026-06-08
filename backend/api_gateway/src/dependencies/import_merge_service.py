"""Dependency injection for ImportMergeService."""

from fastapi import Depends
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections
from src.services.import_merge_service import ImportMergeService


def get_import_merge_service(
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> ImportMergeService:
    """Return an ImportMergeService instance wired to the database."""
    return ImportMergeService(db_collections)
