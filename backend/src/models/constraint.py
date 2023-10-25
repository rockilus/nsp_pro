from datetime import datetime

from mongoengine import (
    Document,
    EmbeddedDocument,
)
from mongoengine.fields import (
    BooleanField,
    DateTimeField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
    EmbeddedDocumentField,
    DynamicField,
)


class VarWorker(EmbeddedDocument):
    operator = StringField(choices=["", "in_target", "out_target"], default="")
    selector = StringField(required=True, choices=["all", "equal"])
    target = ListField(ReferenceField("Worker"), default=[])
    num_eligible_workers = IntField(default=0)


# Check if we can replace target with start and end dates
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
    reference = ReferenceField("Shift")
    relative = ReferenceField("Shift")


class BuildBlock(EmbeddedDocument):
    name = StringField(required=True)
    value = DynamicField(required=True)


class ConstraintSum(EmbeddedDocument):
    operator = StringField(
        required=True,
        choices=[
            "less_than_or_equal",
            "equal",
            "greater_than_or_equal",
        ],
    )
    target_value = IntField(required=True)


class ConstraintSeq(Document):
    id = str
    operator = StringField(
        required=True,
        choices=[
            "less_than_or_equal",
            "equal",
            "greater_than_or_equal",
        ],
    )
    target_value = IntField(required=True)


# replace constraint/aggregator with type string
class Constraint(Document):
    meta = {"collection": "constraints"}

    id = StringField(primary_key=True, required=True)
    # rename to aggregator
    constraint_type = StringField(required=True, choices=["sum", "seq"])
    operator = StringField(
        choices=[
            "less_than_or_equal",
            "equal",
            "greater_than_or_equal",
            "yes",
            "no",
        ],
    )
    target_value = IntField(default=0)
    worker_var = EmbeddedDocumentField(VarWorker)
    day_var = EmbeddedDocumentField(VarDay)
    shift_var = EmbeddedDocumentField(VarShift)
    hard = BooleanField(required=True)
    penalty = IntField(default=0)
    active = BooleanField(default=True)
    build_blocks = ListField(EmbeddedDocumentField(BuildBlock))
