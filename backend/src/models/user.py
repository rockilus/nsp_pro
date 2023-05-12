from typing import Dict

# from bson import ObjectId
from flask_bcrypt import Bcrypt  # type: ignore
from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    DictField,
    EmailField,
    ObjectIdField,
    ReferenceField,
    StringField,
)

bcrypt = Bcrypt()


class User(Document):
    _id = ObjectIdField(primary_key=True)
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    email = EmailField(required=True, unique=True)
    password = StringField()
    hospital = ReferenceField("Hospital")
    active = BooleanField(default=False)
    profile = DictField()

    meta = {"collection": "users"}

    def to_dict(self) -> Dict:
        print("self:", self)
        print("self._id:", self._id)
        print("self._id str:", str(self._id))
        return {
            "_id": str(self._id),
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "password": self.password,
            "hospital": str(self.hospital["_id"]) if self.hospital else None,
            "active": self.active,
            "profile": self.profile,
        }

    def encrypt_password(self, password: str) -> str:
        return bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password: str) -> bool:
        return bcrypt.check_password_hash(self.password, password)
