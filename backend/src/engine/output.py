from datetime import date
from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import (
    Assignment,
    ConstraintBreach,
    Outputs,
)
from engine.model import Model

import json


class Output:
    def __init__(self, model: Model) -> None:
        self.model = model

    def build_outputs(self) -> Outputs:
        solution_exist = self.model.status in (
            cp_model.OPTIMAL,
            cp_model.FEASIBLE,
        )
        if solution_exist:
            assignments = self.build_solution()
        else:
            assignments = []
        objective_value = self.model.solver.ObjectiveValue()
        constraint_breaches = self.build_constraint_breaches()
        return Outputs(
            solution_exist, assignments, objective_value, constraint_breaches
        )

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
        print("Penalties:")
        for i, var in enumerate(self.model.obj.bool_vars):
            if self.model.solver.BooleanValue(var):
                penalty = self.model.obj.bool_coeffs[i]
                if penalty > 0:
                    print(f"{var.Name()} violated, penalty={penalty}")
                else:
                    print(f"{var.Name()} fulfilled, gain={-penalty}")

        for i, var in enumerate(self.model.obj.int_vars):
            if self.model.solver.Value(var) > 0:
                var_name = json.loads(var.Name())
                variables = [var.split("_") for var in var_name["cstr_vars"]]
                for variable in variables:
                    variable[1] = date.fromisoformat(variable[1])
                constraint_breach = ConstraintBreach(
                    constraint_id=var_name["constraint_id"],
                    variables=variables,
                    value_diff=self.model.solver.Value(var),
                    penalty=self.model.obj.int_coeffs[i],
                )
                constraint_breaches.append(constraint_breach)
        return constraint_breaches
