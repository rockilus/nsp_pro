from fastapi import Request
from shared.database.database_collections import DatabaseCollections


def get_db_collections(request: Request) -> DatabaseCollections:
    """
    Dependency to retrieve the db_collections object from the app state.
    """
    return request.app.state.db_collections
