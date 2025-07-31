from shared.database.database_collections import DatabaseCollections
from shared.database.factory import DatabaseFactory
from shared.logger import log_info

from config import config, get_documentdb_credentials


def get_collections() -> DatabaseCollections:
    """
    Initialize database connection and return database collections.
    """
    log_info("Setting up database connection for solve service...")

    if config.use_documentdb:
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
    log_info("Database collections initialized successfully for solve service")

    return db_collections


# # Set up the database and initialize collections
# collections = setup_database(config.db_uri)

# # Access the collections as needed
# db = collections.db
# assignment_db = collections.assignment_db
# attribute_db = collections.attribute_db
# breach_db = collections.breach_db
# config_db = collections.config_db
# constraint_build_db = collections.constraint_build_db
# coverage_db = collections.coverage_db
# coverage_selector_db = collections.coverage_selector_db
# daily_shift_demand_db = collections.daily_shift_demand_db
# dimension_db = collections.dimension_db
# dim_entry_db = collections.dim_entry_db
# request_db = collections.request_db
# schedule_db = collections.schedule_db
# shift_db = collections.shift_db
# shift_demand_db = collections.shift_demand_db
# specialty_db = collections.specialty_db
# stats_header_db = collections.stats_header_db
# team_db = collections.team_db
# user_db = collections.user_db
# worker_db = collections.worker_db
