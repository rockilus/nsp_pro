from shared.database.database_collections import DatabaseCollections
from shared.database.factory import DatabaseFactory
from shared.logger import log_info

from src.config import config, get_documentdb_credentials


def setup_database() -> DatabaseCollections:
    """
    Initialize database connection and return database collections.
    """
    log_info("Setting up database connection...")

    if config.environment == "production":
        log_info("Using DocumentDB for database connection")

        # Get DocumentDB credentials from AWS Secrets Manager
        documentdb_credentials = get_documentdb_credentials(
            secret_name=config.documentdb_secret_name,
            region_name=config.aws_region,
        )

        db = DatabaseFactory.create_connection(
            db_uri="",  # Not used for DocumentDB
            db_name=config.documentdb_database_name,
            use_documentdb=True,
            documentdb_credentials=documentdb_credentials,
            documentdb_ca_bundle_path=config.documentdb_ca_bundle_path,
            timeoutMS=30000,
        )
    else:
        log_info("Using MongoDB for database connection")
        if config.environment == "development":
            db_name = "nsp_pro_dev"
        else:
            db_name = "nsp_pro"
        db = DatabaseFactory.create_connection(
            db_uri=config.db_uri,
            db_name=db_name,
            use_documentdb=False,
            timeoutMS=30000,
        )

    # Initialize all database collections
    db_collections = DatabaseCollections(db)
    log_info("Database collections initialized successfully")

    return db_collections
