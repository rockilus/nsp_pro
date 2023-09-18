from mongoengine import Document
from mongoengine.fields import (
    ObjectIdField,
    IntField,
    StringField,
    ReferenceField,
    BooleanField,
)


class ConstraintVariable(Document):
    meta = {"collection": "constraint_variables"}
    _id = ObjectIdField(primary_key=True)
    param = StringField(choices=["worker", "day", "shift"], required=True)
    operator = StringField(
        choices=["all", "equal", "interval", "offset", "pair"], default="all"
    )
    value = IntField(default=0)
    interval = IntField(default=0)
    other_value = IntField(default=0)
    intra = BooleanField(default=False)
    constraint = ReferenceField("Constraint")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "param": self.param,
            "operator": self.operator,
            "value": self.value,
            "interval": self.interval,
            "other_value": self.other_value,
            "intra": self.intra,
            "constraint": str(self.constraint["_id"]),
        }
