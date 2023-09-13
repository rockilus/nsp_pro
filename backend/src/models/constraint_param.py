from mongoengine import Document
from mongoengine.fields import (
    ListField,
    ObjectIdField,
    StringField,
    ReferenceField,
)


class ConstraintParam(Document):
    meta = {"collection": "constraint_params"}
    _id = ObjectIdField(primary_key=True)
    constraint_types_options = ListField(default=["add", "sum", "sequence", "order"])
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


# contraint_param = {
#     "constraint_types_options": [
#         "add",
#         "sum",
#         "sequence",
#         "order",
#     ],
#     "soft_or_hard_options": ["hard", "soft"],
#     "soft_priority_options": ["low", "medium", "high"],
#     "constraint_param": {
#         "variable_options": ["worker", "day", "shift"],
#         "add": {
#             "operator_options": ["per"],
#         },
#         "sum": {
#             "operator_options": ["at_least", "at_most"],
#             "timing_options": ["per"],
#             "ref_var_value_options": ["week"],
#         },
#         "sequence": {
#             "operator_options": ["at_least", "at_most"],
#             "timing_options": ["per"],
#             "ref_var_value_options": ["week"],
#         },
#         "order": {
#             "operator_options": ["no"],
#             "timing_options": ["after"],
#         },
#     },
# }


#   const constraintTypesOptions: Record<string, string> = {
#     add: "Add",
#     sum: "Sum",
#     sequence: "Sequence",
#     order: "Order",
#   };

#   const softOrHardOptions: Record<string, string> = {
#     hard: "Hard",
#     soft: "Soft",
#   };

#   const softPriorityOptions: Record<string, string> = {
#     low: "Low",
#     medium: "Medium",
#     high: "High",
#   };

# # ADD
#   const variableOptions: Record<string, string> = {
#     worker: "worker",
#     day: "day",
#     shift: "shift",
#   };

#   const operatorOptions: Record<string, string> = {
#     per: "per",
#   };

# # SUM
# const variableOptions: Record<string, string> = {
#     worker: "worker",
#     day: "day",
#     shift: "shift",
#   };

#   const operatorOptions: Record<string, string> = {
#     at_least: "At least",
#     at_most: "At most",
#   };

#   const varValueOptions: Record<string, string> = {
#     0: "off",
#     1: "morning",
#     2: "afternoon",
#     3: "night",
#   };

#   const timingOptions: Record<string, string> = {
#     per: "per",
#   };

#   const refVarValueOptions: Record<string, string> = {
#     week: "week",
#   };

# # SEQ
# const variableOptions: Record<string, string> = {
#     worker: "worker",
#     day: "day",
#     shift: "shift",
#   };

#   const operatorOptions: Record<string, string> = {
#     at_least: "At least",
#     at_most: "At most",
#   };

#   const varValueOptions: Record<string, string> = {
#     0: "off",
#     1: "morning",
#     2: "afternoon",
#     3: "night",
#   };

#   const timingOptions: Record<string, string> = {
#     per: "per",
#   };

#   const refVarValueOptions: Record<string, string> = {
#     week: "week",
#   };


# # ORD
#   const variableOptions: Record<string, string> = {
#     worker: "worker",
#     day: "day",
#     shift: "shift",
#   };

#   const operatorOptions: Record<string, string> = {
#     no: "No",
#   };

#   const varValueOptions: Record<string, string> = {
#     0: "off",
#     1: "morning",
#     2: "afternoon",
#     3: "night",
#   };

#   const timingOptions: Record<string, string> = {
#     after: "after",
#   };

#   const refVarValueOptions: Record<string, string> = {
#     0: "off",
#     1: "morning",
#     2: "afternoon",
#     3: "night",
#   };
