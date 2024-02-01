from mongoengine import Document
from mongoengine.fields import DateTimeField, StringField


class StatsOptions(Document):
    meta = {"collection": "stats_options"}

    id = StringField(primary_key=True, required=True)
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
