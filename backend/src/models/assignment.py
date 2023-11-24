from mongoengine import Document
from mongoengine.fields import DateTimeField, ReferenceField, StringField


class Assignment(Document):
    meta = {"collection": "assignments"}

    id = StringField(primary_key=True, required=True)
    worker = ReferenceField("Worker", required=True)
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift", required=True)
    schedule = ReferenceField("Schedule", required=True)
