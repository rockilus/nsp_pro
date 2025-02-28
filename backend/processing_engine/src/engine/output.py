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
            var_sol = {
                n: 1 if self.model.solver.BooleanValue(v) else 0
                for n, v in self.model.variables.items()
            }
            var_spe_sol = {
                n: 1 if self.model.solver.BooleanValue(v) else 0
                for n, v in self.model.assignment_wdss.items()
            }
            return Outputs(
                model=self.model.model,
                is_solution=is_solution,
                assignments=assignments,
                objective_value=objective_value,  # type: ignore # [CHECK IF OK]
                breaches=breaches,
                var_sol=var_sol,
                var_spe_sol=var_spe_sol,
            )
        return Outputs(
            model=self.model.model,
            is_solution=is_solution,
            assignments=[],
            objective_value=0,
            breaches=[],
            var_sol={},
            var_spe_sol={},
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

        for var_spe, bool_var_spe in self.model.assignment_wdss.items():
            var_gen = self.model.variables[(var_spe[0], var_spe[1], var_spe[2])]
            if self.model.solver.BooleanValue(
                bool_var_spe
            ) and not self.model.solver.BooleanValue(var_gen):
                print("Spe var implication failed")

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
