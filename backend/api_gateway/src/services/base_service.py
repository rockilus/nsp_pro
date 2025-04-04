from shared.database.database_collections import DatabaseCollections


# pylint: disable=too-few-public-methods
class BaseService:
    def __init__(self, collection: DatabaseCollections):
        self.collection = collection
