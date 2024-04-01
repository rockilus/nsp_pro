from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint


class AddConstraintFil(AddConstraint):
    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        for w in w_vars:
            for d in d_vars:
                for s in s_vars:
                    self._add_constraint_fil_to_model(
                        constraint, self.variables[w, d, s]
                    )

    def _add_constraint_fil_to_model(
        self, constraint: Constraint, cstr_var: cp_model.IntVar
    ) -> None:
        if constraint.hard:
            self.model.Add(cstr_var == 0)
        else:
            if constraint.penalty != 0:
                cstr_vars: List[cp_model.IntVar] = [cstr_var]
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                cstr_vars = [
                    var.Not() for var in cstr_vars  # type: ignore # [CHECK IF OK]
                ]
                lit = self.model.NewBoolVar(var_name)
                cstr_vars.append(lit)
                self.model.AddBoolOr(cstr_vars)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(constraint.penalty)
