from mongoengine import Document
from mongoengine.fields import DateTimeField, IntField, ReferenceField


class ShiftDemand(Document):
    meta = {"collection": "shift_demands"}

    day_index = IntField(min_value=0, max_value=6, required=True)
    shift = ReferenceField("Shift", required=True)
    quantity = IntField(required=True)
    start_time = DateTimeField(required=True)
    duration = IntField(required=True)
    coverage = ReferenceField("Coverage", required=True)
