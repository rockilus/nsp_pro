from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import Assignment, Comments, ConstraintBreach, Outputs
from engine.model import Model


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
        comments = Comments(
            constraint_breaches=self.build_constraint_breaches(),
            missing_coverage_dates=self.build_missing_coverage_dates(),
        )
        return Outputs(solution_exist, assignments, comments)

    def build_solution(self) -> List[Assignment]:
        assignments = []
        for variable, bool_var in self.model.variables.items():
            if self.model.solver.BooleanValue(bool_var):
                assignments.append(Assignment(variable[0], variable[1], variable[2]))
        return assignments

    def build_constraint_breaches(self) -> List[ConstraintBreach]:
        return []

    def build_missing_coverage_dates(self) -> List[str]:
        return []
