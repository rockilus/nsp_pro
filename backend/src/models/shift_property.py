from mongoengine import Document
from mongoengine.fields import (
    DynamicField,
    ObjectIdField,
    ReferenceField,
)


class ShiftProperty(Document):
    meta = {"collection": "shift_properties"}
    _id = ObjectIdField(primary_key=True)
    value = DynamicField()
    shift = ReferenceField("Shift")
    shift_param = ReferenceField("ShiftParam")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "value": self.value,
            "shift": str(self.shift["_id"]),
            "shift_param": str(self.shift_param["_id"]),
        }
