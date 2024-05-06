from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DateTimeField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)


class QuickStaffing(EmbeddedDocument):
    worker = ReferenceField("Worker", required=True)
    shift = ReferenceField("Shift", required=True)
    target = IntField(required=True)


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
    constraint_builds = ListField(ReferenceField("ConstraintBuild"))
    quick_staffings = ListField(EmbeddedDocumentField(QuickStaffing))
