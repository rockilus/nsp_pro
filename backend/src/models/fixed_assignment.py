from mongoengine import Document
from mongoengine.fields import DateTimeField, ReferenceField, StringField


class FixedAssignment(Document):
    meta = {"collection": "fixed_assignments"}

    id = StringField(primary_key=True, required=True)
    worker = ReferenceField("Worker", required=True)
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift", required=True)
    status = StringField(
        required=True,
        choices=["pending", "approved", "rejected", "disabled"],
        default="pending",
    )
