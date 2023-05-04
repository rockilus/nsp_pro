from mongoengine import Document
from mongoengine.fields import IntField, ReferenceField

from models.hospital import Hospital


class Parameters(Document):
    nb_weeks = IntField(required=True)
    nb_days_week = IntField(required=True)
    nb_shifts_day = IntField(required=True)
    nb_days_workweek = IntField(required=True)
    nb_days_weekend = IntField(required=True)
    hospital = ReferenceField(Hospital)
