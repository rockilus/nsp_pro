# from bson import ObjectId
from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DictField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class Parameters(EmbeddedDocument):
    nb_weeks = IntField(required=True, default=1)
    nb_shifts_day = IntField(required=True, default=1)

    def to_dict(self):
        return {
            "nb_weeks": self.nb_weeks,
            "nb_shifts_day": self.nb_shifts_day,
        }


class Hospital(Document):
    _id = ObjectIdField(primary_key=True)
    name = StringField(required=True, unique=True)
    admin = ListField(ReferenceField("User"))
    profile = DictField()
    profile_validation = DictField()
    parameters = EmbeddedDocumentField(Parameters, default=Parameters())

    meta = {"collection": "hospitals"}

    def to_dict(self):
        return {
            "_id": str(self._id),
            "name": self.name,
            "admin": [str(user["_id"]) for user in self.admin],
            "profile": self.profile,
            "profile_validation": self.profile_validation,
            "parameters": self.parameters.to_dict(),
        }
