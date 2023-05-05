from typing import Dict

from bson import ObjectId
from flask_bcrypt import Bcrypt  # type: ignore
from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    EmailField,
    ReferenceField,
    StringField,
)

bcrypt = Bcrypt()


class User(Document):
    _id = ObjectId()
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    password = StringField(required=True)
    hospital = ReferenceField("Hospital")
    active = BooleanField(default=False)

    meta = {"collection": "user"}

    def to_dict(self) -> Dict:
        return {
            "_id": str(self._id),
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "password": self.password,
            "hospital": self.hospital.to_dict() if self.hospital else None,
            "active": self.active,
        }

    def encrypt_password(self, password: str) -> str:
        return bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password, password)
