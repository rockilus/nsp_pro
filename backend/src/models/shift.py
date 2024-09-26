from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    IntField,
    ReferenceField,
    StringField,
)

from core import ShiftLeaveType


class Shift(Document):
    meta = {"collection": "shifts"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    start_time = DateTimeField(required=True)
    end_time = DateTimeField(required=True)
    staffing = IntField(required=True)
    is_time_off = BooleanField(required=True)
    color = StringField(required=True)
    leave_type = IntField(required=True, choices=[e.value for e in ShiftLeaveType])
    deleted = BooleanField(required=True)
