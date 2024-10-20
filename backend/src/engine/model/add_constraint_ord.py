from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import ConstraintOperator, ConstraintOrd


# pylint: disable=too-few-public-methods
class AddConstraintOrd(AddConstraint):
    def add_constraint(self, constraint: ConstraintOrd, hard_to_soft: bool) -> None:
        for coord_ref, coord_rel in constraint.constraint_variables:
            constraint_vars = [
                self.variables[coord_ref],
                self.variables[coord_rel],
            ]
            self._add_constraint_ord_to_model(constraint, constraint_vars, hard_to_soft)

    def _add_constraint_ord_to_model(
        self,
        constraint: ConstraintOrd,
        cstr_vars: List[cp_model.IntVar],
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.YES:
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == ConstraintOperator.NO:
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)  # type: ignore # [CHECK IF OK]
        # pylint: disable=R0801
        else:
            penalty = get_nested_value(
                self.model_config,
                [
                    "penalties",
                    "user_constraint",
                    "ord",
                    "hard" if constraint.hard else "soft",
                ],
            )
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            if constraint.operator == ConstraintOperator.YES:
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == ConstraintOperator.NO:
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            trans_var = self.model.NewBoolVar(var_name)
            transition.append(trans_var)
            self.model.AddBoolOr(transition)  # type: ignore # [CHECK IF OK]
            self.obj.bool_vars.append(trans_var)
            self.obj.bool_coeffs.append(penalty)
