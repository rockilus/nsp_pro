from typing import List

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name_constraint, get_nested_value
from engine.types import ConstraintFil, ObjectiveCategory
from ortools.sat.python import cp_model  # type: ignore


# pylint: disable=too-few-public-methods
class AddConstraintFil(AddConstraint):
    def add_constraint(self, constraint: ConstraintFil, hard_to_soft: bool) -> None:
        for coord in constraint.constraint_variables:
            self._add_constraint_fil_to_model(
                constraint, self.variables[coord], hard_to_soft
            )

    def _add_constraint_fil_to_model(
        self,
        constraint: ConstraintFil,
        cstr_var: cp_model.IntVar,
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            self.model.Add(cstr_var == 0)
        # pylint: disable=R0801
        else:
            penalty = get_nested_value(
                self.model_config,
                [
                    "penalties",
                    "user_constraint",
                    "fil",
                    "hard" if constraint.hard else "soft",
                ],
            )
            cstr_vars: List[cp_model.IntVar] = [cstr_var]
            var_name = build_var_name_constraint(
                constraint, cstr_vars, ObjectiveCategory.CONSTRAINT
            )
            cstr_vars = [var.Not() for var in cstr_vars]  # type: ignore # [CHECK IF OK]
            lit = self.model.NewBoolVar(var_name)
            cstr_vars.append(lit)
            self.model.AddBoolOr(cstr_vars)
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(penalty)
