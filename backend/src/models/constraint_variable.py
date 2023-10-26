from mongoengine import Document
from mongoengine.fields import (
    BooleanField,
    IntField,
    ObjectIdField,
    ReferenceField,
    StringField,
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


# class VarWorker(Document):
#     operator = StringField(choices=["", "in_target", "out_target"], default="")
#     selector = StringField(required=True, choices=["all", "equal"])
#     target = ListField(ReferenceField("Worker"), default=[])
#     num_eligible_workers = IntField(default=0)


# # Check if we can replace target with start and end dates
# class VarDay(Document):
#     selector = StringField(
#         required=True, choices=["all", "week", "period", "week_day_index"]
#     )
#     target = ListField(DateTimeField(), default=[])
#     start_date = DateTimeField(default=datetime.now())
#     end_date = DateTimeField(default=datetime.now())
#     interval = IntField(default=0)


# class VarShift(Document):
#     operator = StringField(choices=["", "in_target", "out_target"], default="")
#     selector = StringField(choices=["", "all", "equal"], default="")
#     target = ListField(ReferenceField("Shift"), default=[])
#     reference = ReferenceField("Shift")
#     relative = ReferenceField("Shift")


####################
# Worker Variables #

# OK
# class VarSumWorker:
#     selector: Literal["all", "equal"]
#     target: str

# OK
# class VarSeqWorker:
#     selector: Literal["all"]

# OK
# class VarOrdWorker:
#     selector: Literal["all"]

# OK
# class VarFilWorker:
#     operator: Literal["in_target", "out_target"]
#     selector: Literal["all", "list"]
#     target: List[str]

# OK
# class VarFaiWorker:
#     selector: Literal["all", "list"]
#     target: List[str]


# class VarEveWorker:
#     selector: Literal["all", "equal"]
#     target: str
#     num_eligible_workers: int

# class VarWorker:
#     operator: Literal["in_target", "out_target"]
#     selector: Literal["all", "equal"]
#     target: List[str]
#     num_eligible_workers: int

##################
# Day Variables #

# OK
# class VarSumDay:
#     selector: Literal["all", "week", "period"]
#     start_date: date = field(default_factory=date.today)
#     end_date: date = field(default_factory=date.today)

# OK
# class VarOrdDay:
#     selector: Literal["all", "week_day_index"]
#     interval: int
#     target: int

# OK
# class VarFilDay:
#     selector: Literal["all"]

# OK
# class VarFaiDay:
#     selector: Literal["all", "week_day_index"]
#     target: int

# OK
# class VarEveDay:
#     selector: Literal["all"]


# Check if we can replace target with start and end dates
# class VarDay:
#     selector: Literal["all", "week", "period", "week_day_index"]
#     target: List[str]
#     start_date: date = field(default_factory=date.today)
#     end_date: date = field(default_factory=date.today)
#     interval: int


###################
# Shift Variables #

# OK
# class VarSumShift:
#     selector: Literal["equal"]
#     target: str

# OK
# class VarSeqShift:
#     selector: Literal["equal"]
#     target: str

# OK
# class VarOrdShift:
#     reference: str
#     relative: str

# OK
# class VarFilShift:
#     operator: Literal["in_target", "out_target"]
#     selector: Literal["all", "list"]
#     target: List[str]

# OK
# class VarFaiShift:
#     selector: Literal["all", "list"]
#     target: List[str]

# OK
# class VarEveShift:
#     selector: Literal["equal"]
#     target: str


# class VarShift:
#     operator: Literal["in_target", "out_target"]
#     selector: Literal["all", "equal"]
#     target: List[str]
#     reference: str
#     relative: str
