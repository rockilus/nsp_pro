from mongoengine import Document
from mongoengine.fields import DynamicField, ReferenceField, StringField


class ShiftProperty(Document):
    meta = {"collection": "shift_properties"}

    id = StringField(primary_key=True, required=True)
    value = DynamicField()
    shift = ReferenceField("Shift")
    shift_dimension = ReferenceField("ShiftDimension")
    dim_entries = ReferenceField("DimEntry")
