from mongoengine import Document
from mongoengine.fields import (
    EmbeddedDocumentField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)

from shared.database.models.constraint_build import ShiftWorkerOption
from shared.schemas.schemas.stats import HeaderUnitOptions, StatsUnitOptions


class StatsHeader(Document):
    meta = {"collection": "stats_headers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    stats_unit = IntField(required=True, choices=[e.value for e in StatsUnitOptions])
    header_unit = IntField(required=True, choices=[e.value for e in HeaderUnitOptions])
    value = StringField(required=True)
    selected_shifts = ListField(EmbeddedDocumentField(ShiftWorkerOption), required=True)
