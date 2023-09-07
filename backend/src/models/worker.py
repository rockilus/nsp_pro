from mongoengine import Document
from mongoengine.fields import ObjectIdField


class Worker(Document):
    meta = {"collection": "workers"}
    _id = ObjectIdField(primary_key=True)

    def to_dict(self):
        return {
            "_id": str(self._id),
        }
