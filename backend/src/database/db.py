import mongoengine  # type: ignore


# pylint: disable=too-few-public-methods
class DB:
    def __init__(self, db_uri: str):
        self.db_uri = db_uri
        self.db = None
        self.connect()

    def connect(self):
        self.db = mongoengine.connect(host=self.db_uri)
        print(f"Connected to {self.db_uri}")
