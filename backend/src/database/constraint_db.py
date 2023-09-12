from typing import List

from bson import ObjectId
from database.db import DB
from models import Constraint


class ConstraintDB:
    def __init__(self, db: DB):
        self.db = db

    def create_constraint(
        self,
        constraint_type: str,
        operator: str = "equal",
        target_value: int = 0,
        hard_constraint: bool = False,
        penalty: int = 0,
        active: bool = True,
    ) -> Constraint:
        constraint = Constraint(
            _id=ObjectId(),
            constraint_type=constraint_type,
            operator=operator,
            target_value=target_value,
            hard_constraint=hard_constraint,
            penalty=penalty,
            active=active,
        )
        constraint_saved = constraint.save()
        return constraint_saved

    def get_constraints(
        self,
    ) -> List[Constraint]:
        # pylint: disable=no-member
        constraints = Constraint.objects.all()  # type: ignore
        return list(constraints)

    def get_constraint_by_id(self, constraint_id: str) -> Constraint:
        # pylint: disable=no-member
        print("constraint_id in get_constraint_by_id:", constraint_id)
        constraint = Constraint.objects.get(_id=constraint_id)  # type: ignore
        return constraint

    def update_constraint(
        self,
        constraint: Constraint,
        constraint_type: str,
        operator: str = "equal",
        target_value: int = 0,
        hard_constraint: bool = False,
        penalty: int = 0,
        active: bool = True,
    ) -> Constraint:
        constraint.constraint_type = constraint_type
        constraint.operator = operator
        constraint.target_value = target_value
        constraint.hard_constraint = hard_constraint
        constraint.penalty = penalty
        constraint.active = active
        constraint_saved = constraint.save()
        return constraint_saved

    def update_constraint_status(
        self,
        constraint: Constraint,
        new_status: bool,
    ) -> Constraint:
        constraint.active = new_status
        constraint_saved = constraint.save()
        return constraint_saved

    def delete_constraint(self, constraint: Constraint) -> None:
        constraint.delete()
