from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    IntField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class Constraint(Document):
    meta = {"collection": "constraints"}
    _id = ObjectIdField(primary_key=True)
    constraint_type = StringField(
        choices=["add", "sum", "sequence", "order"], required=True
    )
    operator = StringField(
        choices=["equal", "at_least", "at_most", "no"],
        default="equal",
    )
    target_value = IntField(default=0)
    hard_constraint = BooleanField(default=False)
    penalty = IntField(default=0)
    active = BooleanField(default=True)
    origin = StringField(choices=["constraint", "timetable"], default="constraint")
    timetable_property = ReferenceField("TimetableProperty")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "constraint_type": self.constraint_type,
            "operator": self.operator,
            "target_value": self.target_value,
            "hard_constraint": self.hard_constraint,
            "penalty": self.penalty,
            "active": self.active,
            "origin": self.origin,
            "timetable_property": str(self.timetable_property["_id"])
            if self.timetable_property
            else "",
        }
