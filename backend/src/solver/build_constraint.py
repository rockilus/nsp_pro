from typing import List, Tuple

from scripts.setup_database import constraint_db, constraint_variable_db


class BuildConstraint:
    def get_constraints_lists(self) -> Tuple[List, List]:
        constraints = constraint_db.get_constraints()
        constraints_variables = [
            constraint_variable_db.get_constraint_variables_by_constraint(
                constraint
            )
            for constraint in constraints
        ]
        constraints_list = [constraint.to_dict() for constraint in constraints]
        constraints_variables_list = [
            [
                constraint_variable.to_dict()
                for constraint_variable in constraint_variables
            ]
            for constraint_variables in constraints_variables
        ]
        return constraints_list, constraints_variables_list
