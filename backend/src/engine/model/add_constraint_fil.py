from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import Constraint


class AddConstraintFil(AddConstraint):
    def add_constraint(self, constraint: Constraint, hard_to_soft: bool) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        for w in w_vars:
            for d in d_vars:
                for s in s_vars:
                    self._add_constraint_fil_to_model(
                        constraint, self.variables[w, d, s], hard_to_soft
                    )

    def _add_constraint_fil_to_model(
        self,
        constraint: Constraint,
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
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            cstr_vars = [var.Not() for var in cstr_vars]  # type: ignore # [CHECK IF OK]
            lit = self.model.NewBoolVar(var_name)
            cstr_vars.append(lit)
            self.model.AddBoolOr(cstr_vars)
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(penalty)
