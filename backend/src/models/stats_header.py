from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    EmbeddedDocumentField,
    ListField,
    ReferenceField,
    StringField,
)


class DictBlockValue(EmbeddedDocument):
    name = StringField(required=True)
    id = StringField(required=True)
    id_type = StringField(required=True)


class StatsHeader(Document):
    meta = {"collection": "stats_headers"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    stats_unit = StringField(
        required=True,
        # pylint: disable = R0801
        choices=[
            "nb_days_worked",
            "time_worked",
            "nb_shifts_worked",
            "nb_rest_days",
            "nb_rest_shifts",
            "nb_times_shift",
            "nb_times_rest",
        ],
    )
    header_unit = StringField(
        required=True,
        choices=["weekday", "week", "month", "year", "all", "shift"],
    )
    value = StringField(required=True)
    selected_shifts = ListField(EmbeddedDocumentField(DictBlockValue), required=True)
