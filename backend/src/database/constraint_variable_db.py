from typing import List

from bson import ObjectId
from database.db import DB
from models import Constraint, ConstraintVariable


class ConstraintVariableDB:
    def __init__(self, db: DB):
        self.db = db

    def create_constraint_variable(
        self,
        constraint: Constraint,
        param: str,
        operator: str = "all",
        value: int = 0,
        interval: int = 0,
        other_value: int = 0,
        intra: bool = False,
    ) -> ConstraintVariable:
        constraint_variable = ConstraintVariable(
            _id=ObjectId(),
            param=param,
            operator=operator,
            value=value,
            interval=interval,
            other_value=other_value,
            intra=intra,
            constraint=constraint,
        )
        constraint_variable_saved = constraint_variable.save()
        return constraint_variable_saved

    def get_constraint_variables_by_constraint(
        self,
        constraint: Constraint,
    ) -> List[ConstraintVariable]:
        # pylint: disable=no-member
        constraint_variables = ConstraintVariable.objects.filter(  # type: ignore
            constraint=constraint
        )
        return list(constraint_variables)

    def get_constraint_variable_by_id(
        self, constraint_variable_id: str
    ) -> ConstraintVariable:
        # pylint: disable=no-member
        print("constraint_id in get_constraint_by_id:", constraint_variable_id)
        constraint_variable = ConstraintVariable.objects.get(  # type: ignore
            _id=constraint_variable_id
        )
        return constraint_variable

    def update_constraint_variable(
        self,
        constraint_variable: ConstraintVariable,
        param: str,
        operator: str = "all",
        value: int = 0,
        interval: int = 0,
        other_value: int = 0,
        intra: bool = False,
    ) -> ConstraintVariable:
        constraint_variable.param = param
        constraint_variable.operator = operator
        constraint_variable.value = value
        constraint_variable.interval = interval
        constraint_variable.other_value = other_value
        constraint_variable.intra = intra
        constraint_variable_saved = constraint_variable.save()
        return constraint_variable_saved

    def delete_constraint_variables(
        self, constraint_variables: List[ConstraintVariable]
    ) -> None:
        for constraint_variable in constraint_variables:
            constraint_variable.delete()
