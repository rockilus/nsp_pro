from typing import List

from bson import ObjectId
from database.db import DB
from models import ConstraintParamOption, ConstraintParam


class ConstraintParamOptionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_default_constraint_param_options(
        self,
        constraint_param: ConstraintParam,
    ) -> List[ConstraintParamOption]:
        constraint_param_option_add = ConstraintParamOption(
            _id=ObjectId(),
            constraint_type="add",
            operator_options=["per"],
            timing_options=[],
            ref_var_value_options=[],
            constraint_param=constraint_param,
        )
        constraint_param_option_sum = ConstraintParamOption(
            _id=ObjectId(),
            constraint_type="sum",
            operator_options=["at_least", "at_most"],
            timing_options=["per"],
            ref_var_value_options=["week"],
            constraint_param=constraint_param,
        )
        constraint_param_option_seq = ConstraintParamOption(
            _id=ObjectId(),
            constraint_type="sequence",
            operator_options=["at_least", "at_most"],
            timing_options=["per"],
            ref_var_value_options=["week"],
            constraint_param=constraint_param,
        )
        constraint_param_option_ord = ConstraintParamOption(
            _id=ObjectId(),
            constraint_type="order",
            operator_options=["no"],
            timing_options=["after"],
            ref_var_value_options=[],
            constraint_param=constraint_param,
        )
        constraint_param_option_add.save()
        constraint_param_option_sum.save()
        constraint_param_option_seq.save()
        constraint_param_option_ord.save()
        # pylint: disable=no-member
        constraint_param_options = ConstraintParamOption.objects.all()  # type: ignore
        return list(constraint_param_options)

    def get_constraint_param_options(
        self,
        constraint_param: ConstraintParam,
    ) -> List[ConstraintParamOption]:
        # pylint: disable=no-member
        constraint_param_options = ConstraintParamOption.objects.filter(  # type: ignore
            constraint_param=constraint_param
        )
        return list(constraint_param_options)
