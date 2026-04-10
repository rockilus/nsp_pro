from fastapi import Request
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections


def get_database(request: Request) -> DatabaseCollections:
    return get_db_collections(request)
