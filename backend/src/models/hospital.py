# from bson import ObjectId
from mongoengine import Document
from mongoengine.fields import (
    DictField,
    ListField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class Hospital(Document):
    _id = ObjectIdField(primary_key=True)
    name = StringField(required=True, unique=True)
    admin = ListField(ReferenceField("User"))
    profile = DictField()
    profile_validation = DictField()

    meta = {"collection": "hospitals"}

    def to_dict(self):
        return {
            "_id": str(self._id),
            "name": self.name,
            "admin": [str(user["_id"]) for user in self.admin],
            "profile": self.profile,
            "profile_validation": self.profile_validation,
        }
