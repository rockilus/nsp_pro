from datetime import datetime, timezone

from mongoengine import Document
from mongoengine.fields import (
    DateTimeField,
    EmailField,
    ListField,
    ReferenceField,
    StringField,
)


class User(Document):
    meta = {"collection": "users"}

    id = StringField(primary_key=True, required=True)
    email = EmailField(required=True, unique=True)
    first_name = StringField()
    last_name = StringField()
    workers = ListField(ReferenceField("Worker"))
    language = StringField(required=True, choices=["en", "es", "fr"])
    sign_up_at = DateTimeField(default=datetime.now(timezone.utc))
    impersonating_user = ReferenceField("User")
