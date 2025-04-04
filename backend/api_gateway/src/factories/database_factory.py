from fastapi import Depends, Request
from shared.database.database_collections import DatabaseCollections

from src.dependencies.database import get_db_collections


def get_database(request: Request = Depends()) -> DatabaseCollections:
    return get_db_collections(request)
