from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DictField,
    EmbeddedDocumentField,
    FloatField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)

from shared.schemas.schemas.schedule import (
    ScheduleSolveStatus,
    ScheduleStatus,
    SolveDetailsStatus,
)


class QuickStaffing(EmbeddedDocument):
    worker = ReferenceField("Worker", required=True)
    shift = ReferenceField("Shift", required=True)
    target = IntField(required=True)


class SolveDetails(EmbeddedDocument):
    task_id = StringField(required=True)
    status = IntField(required=True, choices=[e.value for e in SolveDetailsStatus])
    updated_at = IntField(required=True)
    result = DictField()


class Schedule(Document):
    meta = {"collection": "schedules"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    start_date = FloatField(required=True)
    end_date = FloatField(required=True)
    solve_details = EmbeddedDocumentField(SolveDetails)
    solve_status = IntField(
        required=True, choices=[e.value for e in ScheduleSolveStatus]
    )
    status = IntField(required=True, choices=[e.value for e in ScheduleStatus])
    missing_coverage_dates = ListField(FloatField())
    constraint_builds = ListField(ReferenceField("ConstraintBuild"))
    quick_staffings = ListField(EmbeddedDocumentField(QuickStaffing))
