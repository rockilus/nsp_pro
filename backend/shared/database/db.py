import mongoengine  # type: ignore
from database.errors import DBConnectionError
from logger import log_debug, log_info
from mongoengine.connection import ConnectionFailure


# pylint: disable=too-few-public-methods
class DB:
    def __init__(self, db_uri: str):
        self.db_uri = db_uri
        self.db = None
        self.client = None

    def connect(self):
        try:
            self.db = mongoengine.connect(host=self.db_uri)
            log_debug("Connected to database mongoengine OK")
        except ConnectionFailure as e:
            log_info("Failed to connect to database mongoengine: " + str(e))
            raise DBConnectionError("Failed to connect to database mongoengine") from e

    def check_mongo_health(self):
        try:
            database = mongoengine.get_db()
            database.command("ping")
        except ConnectionFailure as e:
            log_info("Database health check error, trying to reconnect: " + str(e))
            self.connect()
            # raise DBConnectionError("Database connection error") from e
        except Exception as e:
            log_info("Database connection error: " + str(e))
            raise DBConnectionError("Database connection error") from e
