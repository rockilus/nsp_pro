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

    def to_dict(self):
        return {
            "_id": str(self._id),
            "constraint_type": self.constraint_type,
            "operator": self.operator,
            "target_value": self.target_value,
            "hard_constraint": self.hard_constraint,
            "penalty": self.penalty,
            "active": self.active,
        }


# class Constraint(Document):
#     meta = {"collection": "constraints"}
#     _id = ObjectIdField(primary_key=True)
#     constraint_type = StringField(choices=["request"])
#     target_value = IntField(default=0)
#     hard_min = IntField(default=0)
#     hard_max = IntField(default=0)
#     soft_min = IntField(default=0)
#     soft_max = IntField(default=0)
#     soft_min_penalty = IntField(default=0)
#     soft_max_penalty = IntField(default=0)
#     hard_constraint = BooleanField(default=False)
#     penalty = IntField(default=0)
#     active = BooleanField(default=True)

#     def to_dict(self):
#         return {
#             "_id": str(self._id),
#         }


# {
#     "intra_params": {
#         "num_workers": {
#             "operator": "equal",
#             "value": 2,
#             "interval": 0,
#             "other_value": 0,
#         },
#         "num_days": {
#             "operator": "equal",
#             "value": 4,
#             "interval": 0,
#             "other_value": 0,
#         },
#         "num_shifts": {
#             "operator": "equal",
#             "value": 3,
#             "interval": 0,
#             "other_value": 0,
#         },
#     },
#     "inter_params": {},
#     "constraint_type": "request",
#     "target_value": 0,
#     "hard_min": 0,
#     "hard_max": 0,
#     "soft_min": 0,
#     "soft_max": 0,
#     "soft_min_penalty": 0,
#     "soft_max_penalty": 0,
#     "hard_constraint": False,
#     "penalty": 2,
# }
