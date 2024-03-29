import mongoengine  # type: ignore
from mongoengine.connection import ConnectionFailure

from errors import DBConnectionError
from logger import log_debug, log_info


# pylint: disable=too-few-public-methods
class DB:
    def __init__(self, db_uri: str):
        self.db_uri = db_uri
        self.db = None

    def connect(self):
        try:
            self.db = mongoengine.connect(host=self.db_uri)
            log_debug("Connected to database OK")
        except ConnectionFailure as e:
            log_info("Failed to connect to database: " + str(e))
            raise DBConnectionError("Failed to connect to database") from e
