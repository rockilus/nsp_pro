from mongoengine import Document
from mongoengine.fields import ObjectIdField


class Worker(Document):
    meta = {"collection": "workers"}
    _id = ObjectIdField(primary_key=True)
    # properties = ListField(ReferenceField("WorkerProperty"))
    # first_name = StringField(required=True)
    # last_name = StringField(required=True)

    def to_dict(self):
        return {
            "_id": str(self._id),
            # "first_name": self.first_name,
            # "last_name": self.last_name,
        }
