from mongoengine import Document
from mongoengine.fields import BooleanField, DateTimeField, ReferenceField, StringField


class Request(Document):
    meta = {"collection": "requests"}

    id = StringField(primary_key=True, required=True)
    worker = ReferenceField("Worker", required=True)
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift", required=True)
    hard = BooleanField(required=True)
    status = StringField(
        required=True,
        choices=["pending", "approved", "rejected", "disabled"],
        default="pending",
    )
