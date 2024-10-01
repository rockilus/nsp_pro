from mongoengine import Document
from mongoengine.fields import DynamicField, ListField, ReferenceField, StringField


class ShiftProperty(Document):
    meta = {"collection": "shift_properties"}

    id = StringField(primary_key=True, required=True)
    value = DynamicField()
    shift = ReferenceField("Shift")
    dimension = ReferenceField("Dimension")
    dim_entries = ListField(ReferenceField("DimEntry"))
