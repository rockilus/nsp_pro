from mongoengine import Document
from mongoengine.fields import DateTimeField, ListField, ReferenceField, StringField


class Schedule(Document):
    meta = {"collection": "schedules"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    start_date = DateTimeField(required=True)
    end_date = DateTimeField(required=True)
    solve_status = StringField(
        required=True
    )  # Not solved, Solved, Hard breached, Soft breached, No solution
    status = StringField(required=True)  # WIP, valid, past
    missing_coverage_dates = ListField(DateTimeField())
