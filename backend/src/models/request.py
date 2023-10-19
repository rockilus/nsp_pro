from mongoengine import Document
from mongoengine.fields import DateTimeField, ReferenceField, StringField


class Request(Document):
    meta = {"collection": "requests"}

    id = StringField(primary_key=True, required=True)
    worker = ReferenceField("Worker")
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift")
    priority = StringField(required=True, choices=["low", "medium", "high"])
