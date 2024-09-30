from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    IntField,
    ReferenceField,
    StringField,
)

from core import ShiftLeaveType, ShiftRestType, ShiftType


class Shift(Document):
    meta = {"collection": "shifts"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    start_time = DateTimeField(required=True)
    end_time = DateTimeField(required=True)
    staffing = IntField(required=True)
    color = StringField(required=True)
    shift_type = IntField(required=True, choices=[e.value for e in ShiftType])
    rest_type = IntField(required=True, choices=[e.value for e in ShiftRestType])
    leave_type = IntField(required=True, choices=[e.value for e in ShiftLeaveType])
    recuperation_time = IntField(required=True)
    recuperation_duty = ReferenceField("Shift")
    deleted = BooleanField(required=True)
