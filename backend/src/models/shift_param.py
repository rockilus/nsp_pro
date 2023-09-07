from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    StringField,
)


class ShiftParam(Document):
    meta = {"collection": "shift_params"}
    _id = ObjectIdField(primary_key=True)
    name = StringField(required=True)
    label = StringField(required=True)
    entry_type = StringField(required=True)
    entry_options = ListField(StringField())

    def to_dict(self):
        print("self.name:", self.name)
        return {
            "_id": str(self._id),
            "name": self.name,
            "label": self.label,
            "entry_type": self.entry_type,
            "entry_options": self.entry_options,
        }
