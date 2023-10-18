from mongoengine import Document
from mongoengine.fields import StringField, DateTimeField, ReferenceField


class FixedAssignment(Document):
    meta = {"collection": "fixed_assignments"}

    id = StringField(primary_key=True, required=True)
    worker = ReferenceField("Worker")
    date = DateTimeField(required=True)
    shift = ReferenceField("Shift")
