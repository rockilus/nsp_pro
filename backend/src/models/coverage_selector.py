from mongoengine import Document
from mongoengine.fields import DateTimeField, ReferenceField, StringField


class CoverageSelector(Document):
    meta = {"collection": "coverage_selectors"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    coverage = ReferenceField("Coverage")
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
