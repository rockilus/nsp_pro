from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DynamicField,
    EmbeddedDocumentField,
    ListField,
    StringField,
)


class Block(EmbeddedDocument):
    name = StringField(
        required=True,
        # pylint: disable = R0801
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
    type = StringField(required=True, choices=["string", "number", "list", "dict"])
    value = DynamicField(required=True)


# replace constraint/aggregator with type string
class ConstraintBuild(Document):
    meta = {"collection": "constraint_builds"}

    id = StringField(primary_key=True, required=True)
    # rename to aggregator
    constraint_type = StringField(
        required=True, choices=["sum", "seq", "ord", "fil", "fai", "eve"]
    )
    template_id = StringField(required=True)
    blocks = ListField(EmbeddedDocumentField(Block))
    text = StringField(required=True)
    hard = BooleanField(required=True)
    priority = StringField(choices=["", "low", "medium", "high"], default="")
    active = BooleanField(default=True)
