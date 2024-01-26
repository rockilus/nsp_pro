from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint


class AddConstraintOrd(AddConstraint):
    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        if not all(isinstance(item, list) for item in d_vars):
            raise TypeError(
                "Expected a list of lists of strings, "
                + f"but got {format(type(d_vars))} instead."
            )
        for w in w_vars:
            for d1, d2 in d_vars:  # type: ignore
                for s_ref, s_rel in s_vars:  # type: ignore
                    constraint_vars = [
                        self.variables[w, d1, s_ref],
                        self.variables[w, d2, s_rel],
                    ]
                    self._add_constraint_ord_to_model(constraint, constraint_vars)

    def _add_constraint_ord_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "yes":
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == "no":
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)
        else:
            if constraint.penalty != 0:
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "yes":
                    transition = [cstr_vars[0].Not(), cstr_vars[1]]
                elif constraint.operator == "no":
                    transition = [cstr_var.Not() for cstr_var in cstr_vars]
                else:
                    raise NotImplementedError(
                        f"Sum constraint operator {constraint.operator} "
                        + "not implemented"
                    )
                trans_var = self.model.NewBoolVar(var_name)
                transition.append(trans_var)
                self.model.AddBoolOr(transition)
                self.obj.bool_vars.append(trans_var)
                self.obj.bool_coeffs.append(constraint.penalty)
