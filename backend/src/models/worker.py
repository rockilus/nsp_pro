from mongoengine import Document
from mongoengine.fields import ReferenceField, StringField


class Worker(Document):
    meta = {"collection": "workers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField()
