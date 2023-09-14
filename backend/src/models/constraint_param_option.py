from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    ReferenceField,
    StringField,
)


class ConstraintParamOption(Document):
    meta = {"collection": "constraint_param_options"}
    _id = ObjectIdField(primary_key=True)
    constraint_type = StringField(choices=["add", "sum", "sequence", "order"])
    operator_options = ListField()
    timing_options = ListField()
    ref_var_value_options = ListField()
    constraint_param = ReferenceField("ConstraintParam")

    def to_dict(self):
        return {
            "_id": str(self._id),
            "constraint_type": self.constraint_type,
            "operator_options": self.operator_options,
            "timing_options": self.timing_options,
            "ref_var_value_options": self.ref_var_value_options,
            "constraint_param": str(self.constraint_param["_id"]),
        }
