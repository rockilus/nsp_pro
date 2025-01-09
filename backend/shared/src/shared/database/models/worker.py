from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    FloatField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)


class Worker(Document):
    meta = {"collection": "workers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    acronym = StringField(required=True)
    acronym_custom = BooleanField(required=True)
    employment_start_date = FloatField(required=True)
    employment_end_date = FloatField()
    weekly_hours = IntField(required=True)
    weekly_hours_desired = IntField(required=True)
    duties_per_month = IntField(required=True)
    annual_leave = IntField(required=True)
    specialties = ListField(ReferenceField("Specialty"))
    deleted = BooleanField(required=True)
