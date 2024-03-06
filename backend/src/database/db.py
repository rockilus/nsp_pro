import mongoengine  # type: ignore

# from pymongo.mongo_client import MongoClient


# pylint: disable=too-few-public-methods
class DB:
    def __init__(self, db_uri: str):
        self.db_uri = db_uri
        self.db = None
        self.connect()

    def connect(self):
        # client = MongoClient(self.db_uri)

        # try:
        #     client.admin.command('ping')
        #     print(
        #         "Pinged your deployment. You successfully connected to MongoDB!"
        #     )
        # except Exception as e:
        #     print(e)
        try:
            self.db = mongoengine.connect(host=self.db_uri)
            print(f"Connected to {self.db_uri}")
        # pylint: disable=broad-except
        except Exception as e:
            print(e)
