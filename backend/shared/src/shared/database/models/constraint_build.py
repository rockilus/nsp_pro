from mongoengine import Document, EmbeddedDocument
from mongoengine.fields import (
    BooleanField,
    DynamicField,
    EmbeddedDocumentField,
    IntField,
    ListField,
    ReferenceField,
    StringField,
)
from schemas import BlockNameOptions, BlockTypeOptions, ConstraintType, SWOIdTypes


class ShiftWorkerOption(EmbeddedDocument):
    name = DynamicField(required=True)
    id = StringField(required=True)
    id_type = IntField(
        required=True,
        choices=[e.value for e in SWOIdTypes],
    )
    is_bool_dim = BooleanField(required=True)
    category_name = StringField(required=True)


class Block(EmbeddedDocument):
    name = IntField(
        required=True,
        # pylint: disable = R0801
        choices=[e.value for e in BlockNameOptions],
    )
    type = IntField(
        required=True,
        choices=[e.value for e in BlockTypeOptions],
    )
    value = DynamicField(required=True)


# replace constraint/aggregator with type string
class ConstraintBuild(Document):
    meta = {"collection": "constraint_builds"}

    id = StringField(primary_key=True, required=True)
    team = ReferenceField("Team", required=True)
    # rename to aggregator
    constraint_type = IntField(required=True, choices=[e.value for e in ConstraintType])
    template_id = StringField(required=True)
    language = StringField(required=True, choices=["en", "es", "fr"])
    blocks = ListField(EmbeddedDocumentField(Block))
    hard = BooleanField(required=True)
    priority = StringField(choices=["", "low", "medium", "high"], default="")
