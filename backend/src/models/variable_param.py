from mongoengine import Document
from mongoengine.fields import (
    IntField,
    ListField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class VariableParam(Document):
    meta = {"collection": "variable_params"}
    _id = ObjectIdField(primary_key=True)
    name = StringField()
    index = IntField()
    value_options = ListField(StringField())
    variable = ReferenceField("Variable")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "name": self.name,
            "index": self.index,
            "value_options": self.value_options,
            "variable": str(self.variable["_id"]),
        }
