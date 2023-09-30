from mongoengine import Document
from mongoengine.fields import ListField, StringField


# pylint: disable=R0801
class ShiftDimension(Document):
    meta = {"collection": "shift_dimensions"}

    id = StringField(primary_key=True, required=True)
    name = StringField(required=True)
    entry_type = StringField(required=True)
    entry_options = ListField(StringField())
