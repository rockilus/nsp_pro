from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    FloatField,
    IntField,
    ReferenceField,
    StringField,
)
from schemas import RequestStatus


class Request(Document):
    meta = {"collection": "requests"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    worker = ReferenceField("Worker", required=True)
    start_date = FloatField(required=True)
    end_date = FloatField(required=True)
    shift = ReferenceField("Shift", required=True)
    negative = BooleanField(required=True)
    hard = BooleanField(required=True)
    status = IntField(
        required=True,
        choices=[e.value for e in RequestStatus],
        default=RequestStatus.PENDING.value,
    )
