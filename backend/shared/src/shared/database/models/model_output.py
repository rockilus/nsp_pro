from mongoengine import Document
from mongoengine.fields import (
    DictField,
    FloatField,
    IntField,
    ReferenceField,
    StringField,
)

from shared.schemas.schemas.model_output import ModelOutputStatus


class ModelOutput(Document):
    meta = {"collection": "model_outputs"}

    id = StringField(primary_key=True, required=True)
    schedule = ReferenceField("Schedule", required=True)
    status = IntField(required=True, choices=[e.value for e in ModelOutputStatus])
    var_sol = DictField(required=True)
    var_spe_sol = DictField(required=True)
    objective_value = FloatField(required=True)
    wall_time = FloatField(required=True)
    output_time = FloatField(required=True)
