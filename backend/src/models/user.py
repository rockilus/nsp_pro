from typing import Dict

from bson import ObjectId
from mongoengine import Document
from mongoengine.fields import EmailField, ReferenceField, StringField


class User(Document):
    _id = ObjectId()
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    hospital = ReferenceField("Hospital")

    meta = {"collection": "user"}

    def to_dict(self) -> Dict:
        return {
            "_id": str(self._id),
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "hospital": self.hospital.to_dict() if self.hospital else None,
        }
