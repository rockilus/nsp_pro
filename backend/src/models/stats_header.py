from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    DynamicField,
    EmbeddedDocumentField,
    ListField,
    ReferenceField,
    StringField,
)


class ShiftPropertyHeader(EmbeddedDocument):
    shift_dimension = ReferenceField("ShiftDimension", required=True)
    property_value = DynamicField(required=True)


class StatsHeader(Document):
    meta = {"collection": "stats_headers"}

    id = StringField(primary_key=True, required=True)
    stats_options = ReferenceField("StatsOptions", required=True)
    type = StringField(
        required=True, choices=["weekday", "week", "month", "year", "shift"]
    )
    value = StringField(required=True)
    shifts_selected = StringField(required=True, choices=["all_shifts", "custom"])
    shifts = ListField(ReferenceField("Shift"))
    shift_property_headers = ListField(EmbeddedDocumentField(ShiftPropertyHeader))
