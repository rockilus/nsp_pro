from datetime import date
from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.model import Model
from engine.types import Assignment, Breach, Outputs


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
            breaches = self.build_constraint_breaches()
            return Outputs(
                is_solution,
                assignments,
                objective_value,  # type: ignore # [CHECK IF OK]
                breaches,
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

    def build_constraint_breaches(self) -> List[Breach]:
        out = []
        # var_debug = {k: v for k, v in self.model.variables.items()}
        for var in self.model.obj.bool_vars:
            if self.model.solver.BooleanValue(var):
                if var.Name() == "":
                    continue
                out.append(
                    Breach(
                        var_name=var.Name(),
                        value_diff=self.model.solver.Value(var),
                    )
                )
        for var in self.model.obj.int_vars:
            if self.model.solver.Value(var) > 0:
                if var.Name() == "":
                    continue
                out.append(
                    Breach(
                        var_name=var.Name(),
                        value_diff=self.model.solver.Value(var),
                    )
                )
        return out
