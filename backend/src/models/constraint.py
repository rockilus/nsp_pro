from datetime import datetime

from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    DynamicField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)


class VarWorker(EmbeddedDocument):
    operator = StringField(choices=["", "in_target", "out_target"], default="")
    selector = StringField(required=True, choices=["all", "equal"])
    target = ListField(ReferenceField("Worker"), default=[])
    num_eligible_workers = IntField(default=0)


class VarDay(EmbeddedDocument):
    selector = StringField(
        required=True, choices=["all", "week", "period", "week_day_index"]
    )
    target = IntField(default=0)
    start_date = DateTimeField(default=datetime.now())
    end_date = DateTimeField(default=datetime.now())
    interval = IntField(default=0)


class VarShift(EmbeddedDocument):
    operator = StringField(choices=["", "in_target", "out_target"], default="")
    selector = StringField(choices=["", "all", "equal"], default="")
    target = ListField(ReferenceField("Shift"), default=[])
    reference = ListField(ReferenceField("Shift"))
    relative = ListField(ReferenceField("Shift"))


class Block(EmbeddedDocument):
    name = StringField(
        required=True,
        choices=[
            "operator",
            "#",
            "timing",
            "shift",
            "worker",
            "text",
            "shift_reference",
            "shift_relative",
            "weekday",
        ],
    )
    type = StringField(required=True, choices=["string", "number", "list"])
    value = DynamicField(required=True)


# replace constraint/aggregator with type string
class Constraint(Document):
    meta = {"collection": "constraints"}

    id = StringField(primary_key=True, required=True)
    # rename to aggregator
    constraint_type = StringField(
        required=True, choices=["sum", "seq", "ord", "fil", "fai", "eve"]
    )
    template_id = StringField(required=True)
    operator = StringField(
        choices=[
            "",
            "less_than",
            "less_than_or_equal",
            "equal",
            "greater_than_or_equal",
            "greater_than",
            "yes",
            "no",
        ],
    )
    target_value = IntField(default=0)
    target_unit = StringField(required=True)  # worker, shift, day, hour
    worker_var = EmbeddedDocumentField(VarWorker, required=True)
    day_var = EmbeddedDocumentField(VarDay, required=True)
    shift_var = EmbeddedDocumentField(VarShift, required=True)
    hard = BooleanField(required=True)
    priority = StringField(choices=["", "low", "medium", "high"], default="")
    active = BooleanField(default=True)
    text = StringField(required=True)
    blocks = ListField(EmbeddedDocumentField(Block))
