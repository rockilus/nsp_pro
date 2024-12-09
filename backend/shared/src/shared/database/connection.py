from shared.database.databases.config_db import ConfigDB
from shared.database.databases.db import DB
from shared.database.errors import DBConnectionError
from shared.database.schemas.database_collections import DatabaseCollections
from shared.logger import log_critical, log_info
from shared.schemas import Config


def ensure_config_exists(config_db: ConfigDB):
    if config_db.get_config() is None:
        config_db.create_config(
            Config(
                id="",
                signup_emails_whitelist_enabled=True,
                signup_emails_whitelist=[],
                signup_emails_attempt=[],
            )
        )
        log_info("Config document not found. Created a new one.")


def setup_database(db_uri: str) -> DatabaseCollections:
    db = DB(db_uri)
    try:
        db.connect()
    except DBConnectionError as e:
        log_critical("Failed to connect to database: " + str(e))
        raise e

    collections = DatabaseCollections(db)

    # Ensure the configuration document exists
    ensure_config_exists(collections.config_db)

    return collections
