from mongoengine import Document
from mongoengine.fields import EmailField, ListField, ReferenceField, StringField


class User(Document):
    meta = {"collection": "users"}

    id = StringField(primary_key=True, required=True)
    email = EmailField(required=True, unique=True)
    first_name = StringField()
    last_name = StringField()
    workers = ListField(ReferenceField("Worker"))
    language = StringField(required=True, choices=["en", "es", "fr"])
