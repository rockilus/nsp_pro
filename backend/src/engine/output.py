import json
from datetime import date
from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.model import Model
from engine.types.input_output_types import Assignment, ConstraintBreach, Outputs
from engine.types.model_types import VarName


class Output:
    def __init__(self, model: Model) -> None:
        self.model = model

    def build_outputs(self) -> Outputs:
        is_solution = self.model.status in (
            cp_model.OPTIMAL,
            cp_model.FEASIBLE,
        )
        if is_solution:
            assignments = self.build_solution()
            objective_value = self.model.solver.ObjectiveValue()
            constraint_breaches = self.build_constraint_breaches()
            return Outputs(
                is_solution,
                assignments,
                objective_value,  # type: ignore # [CHECK IF OK]
                constraint_breaches,
            )
        return Outputs(is_solution, [], 0, [])

    def build_solution(self) -> List[Assignment]:
        assignments = []
        for variable, bool_var in self.model.variables.items():
            if self.model.solver.BooleanValue(bool_var):
                assignments.append(
                    Assignment(
                        variable[0],
                        date.fromisoformat(variable[1]),
                        variable[2],
                    )
                )
        return assignments

    def build_constraint_breaches(self) -> List[ConstraintBreach]:
        constraint_breaches = []
        # var_debug = {k: v for k, v in self.model.variables.items()}
        for i, var in enumerate(self.model.obj.bool_vars):
            if self.model.solver.BooleanValue(var):
                var_name = VarName(**json.loads(var.Name()))
                variables = [
                    (v[0], date.fromisoformat(v[1]), v[2])
                    for v in [v.split("_") for v in var_name.cstr_vars]
                ]
                constraint_breach = ConstraintBreach(
                    constraint_id=var_name.constraint_id,
                    category=var_name.category,
                    variables=variables,
                    hard_to_soft=var_name.hard_to_soft,
                    value_diff=self.model.solver.Value(var),
                    penalty=self.model.obj.bool_coeffs[i],
                )
                constraint_breaches.append(constraint_breach)

        for i, var in enumerate(self.model.obj.int_vars):
            if self.model.solver.Value(var) > 0:
                if var.Name() == "":
                    continue
                var_name = VarName(**json.loads(var.Name()))
                variables = [
                    (v[0], date.fromisoformat(v[1]), v[2])
                    for v in [v.split("_") for v in var_name.cstr_vars]
                ]
                constraint_breach = ConstraintBreach(
                    constraint_id=var_name.constraint_id,
                    category=var_name.category,
                    variables=variables,
                    hard_to_soft=var_name.hard_to_soft,
                    value_diff=self.model.solver.Value(var),
                    penalty=self.model.obj.int_coeffs[i],
                )
                constraint_breaches.append(constraint_breach)
        return constraint_breaches
