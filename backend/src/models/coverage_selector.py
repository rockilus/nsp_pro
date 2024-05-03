from mongoengine import Document
from mongoengine.fields import BooleanField, DateTimeField, ReferenceField, StringField


class CoverageSelector(Document):
    meta = {"collection": "coverage_selectors"}

    id = StringField(primary_key=True, required=True)
    schedule = ReferenceField("Schedule", required=True)
    coverage = ReferenceField("Coverage")
    full_period = BooleanField(required=True)
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
