from shared.database.database_collections import DatabaseCollections

from src.config import config


def setup_database() -> DatabaseCollections:
    """
    Initialize and return the database collections.
    """
    return DatabaseCollections(config.db_uri, "test")
