from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    EmbeddedDocumentListField,
    FloatField,
    IntField,
    ReferenceField,
    StringField,
)

from shared.schemas.schemas.shift import ShiftLeaveType, ShiftRestType, ShiftType


class Staffing(EmbeddedDocument):
    specialty = ReferenceField("Specialty", required=False)
    staffing = IntField(required=True)


# pylint: disable=R0801
class Shift(Document):
    meta = {"collection": "shifts"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    acronym = StringField(required=True)
    acronym_custom = BooleanField(required=True)
    start_time = FloatField(required=True)
    end_time = FloatField(required=True)
    staffing = EmbeddedDocumentListField(Staffing)
    color = StringField(required=True)
    shift_type = IntField(required=True, choices=[e.value for e in ShiftType])
    rest_type = IntField(required=True, choices=[e.value for e in ShiftRestType])
    leave_type = IntField(required=True, choices=[e.value for e in ShiftLeaveType])
    recuperation_time = IntField(required=True)
    recuperation_duty = ReferenceField("Shift")
    deleted = BooleanField(required=True)
