from mongoengine import Document
from mongoengine.fields import FloatField, IntField, ReferenceField, StringField

from shared.schemas.schemas.coverage import DSDSourceType


class DailyShiftDemand(Document):
    meta = {"collection": "daily_shift_demands"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    schedule = ReferenceField("Schedule", required=True)
    shift_demand = ReferenceField("ShiftDemand")
    source_type = IntField(choices=[s.value for s in DSDSourceType], required=True)
    date = FloatField(required=True)
    shift = ReferenceField("Shift", required=True)
    count = IntField(required=True)
