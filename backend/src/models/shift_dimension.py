from mongoengine import Document
from mongoengine.fields import ListField, StringField


# pylint: disable=R0801
class ShiftDimension(Document):
    meta = {"collection": "shift_dimensions"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    entry_type = StringField(required=True, choices=["str", "int", "bool", "list"])
    entry_options = ListField(StringField())
