from mongoengine import Document
from mongoengine.fields import BooleanField, ReferenceField, StringField


class Worker(Document):
    meta = {"collection": "workers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    deleted = BooleanField(required=True)
