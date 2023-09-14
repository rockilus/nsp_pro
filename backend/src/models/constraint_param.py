from mongoengine import Document
from mongoengine.fields import ListField, ObjectIdField


class ConstraintParam(Document):
    meta = {"collection": "constraint_params"}
    _id = ObjectIdField(primary_key=True)
    constraint_types_options = ListField(
        default=["add", "sum", "sequence", "order"]
    )
    soft_or_hard_options = ListField(default=["hard", "soft"])
    soft_priority_options = ListField(default=["low", "medium", "high"])
    variable_options = ListField(default=["worker", "day", "shift"])

    def to_dict(self):
        return {
            "_id": str(self._id),
            "constraint_types_options": self.constraint_types_options,
            "soft_or_hard_options": self.soft_or_hard_options,
            "soft_priority_options": self.soft_priority_options,
            "variable_options": self.variable_options,
        }
