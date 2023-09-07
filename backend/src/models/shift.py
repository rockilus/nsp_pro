from mongoengine import Document
from mongoengine.fields import ObjectIdField


class Shift(Document):
    meta = {"collection": "shifts"}
    _id = ObjectIdField(primary_key=True)

    def to_dict(self):
        return {
            "_id": str(self._id),
        }
