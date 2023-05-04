from bson import ObjectId
from mongoengine import Document
from mongoengine.fields import ListField, ReferenceField, StringField


class Hospital(Document):
    _id = ObjectId()
    name = StringField(required=True, unique=True)
    admin = ListField(ReferenceField("User"))

    meta = {"collection": "user"}

    def to_dict(self):
        return {
            "_id": str(self._id),
            "name": self.name,
            "admin": [user.to_dict() for user in self.admin],
        }
