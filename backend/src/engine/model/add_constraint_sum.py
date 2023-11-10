from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint


class AddConstraintSum(AddConstraint):
    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        for w in w_vars:
            for s in s_vars:
                for period in d_vars:
                    constraint_vars = [self.variables[w, d, s] for d in period]
                    self._add_constraint_sum_to_model(constraint, constraint_vars)

    def _add_constraint_sum_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                sum_var = self.model.NewIntVar(0, constraint.target_value, "")
            elif constraint.operator == "equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value,
                    constraint.target_value,
                    "",
                )
            elif constraint.operator == "greater_than_or_equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value, len(cstr_vars), ""
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(cstr_vars))
        else:
            if constraint.penalty != 0:
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "less_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                    excess = self.model.NewIntVar(
                        -len(cstr_vars),
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "greater_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == constraint.target_value - sum(cstr_vars))
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
