from mongoengine import Document
from mongoengine.fields import BooleanField, IntField, ReferenceField, StringField


class Worker(Document):
    meta = {"collection": "workers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    name = StringField(required=True)
    weekly_hours = IntField(required=True)
    weekly_hours_desired = IntField(required=True)
    duties_per_month = IntField(required=True)
    annual_leave = IntField(required=True)
    deleted = BooleanField(required=True)
