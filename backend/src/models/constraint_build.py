from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DynamicField,
    EmbeddedDocumentField,
    ListField,
    ReferenceField,
    StringField,
)

# class ShiftWorkerOption(EmbeddedDocument):
#     name: str | bool
#     id: str
#     id_type: Constants.SHIFT_WORKER_OPTION_ID_TYPES_OPTIONS
#     is_bool_dim: bool
#     category_name: str


class ShiftWorkerOption(EmbeddedDocument):
    name = DynamicField(required=True)
    id = StringField(required=True)
    id_type = StringField(
        required=True,
        choices=["shift", "worker", "dimension", ""],
    )
    is_bool_dim = BooleanField(required=True)
    category_name = StringField(required=True)


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
    type = StringField(
        required=True,
        choices=["string", "number", "list", "shift_worker_option"],
    )
    value = DynamicField(required=True)


# replace constraint/aggregator with type string
class ConstraintBuild(Document):
    meta = {"collection": "constraint_builds"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    # rename to aggregator
    constraint_type = StringField(
        required=True, choices=["sum", "seq", "ord", "fil", "fai", "eve"]
    )
    template_id = StringField(required=True)
    language = StringField(required=True, choices=["en", "es", "fr"])
    blocks = ListField(EmbeddedDocumentField(Block))
    hard = BooleanField(required=True)
    priority = StringField(choices=["", "low", "medium", "high"], default="")
