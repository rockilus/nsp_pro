from ortools.sat.python import cp_model  # type: ignore
from exceptions import NoSolutionError


# pylint: disable=too-few-public-methods
class Solver:
    def solve(self, model: cp_model.CpModel) -> cp_model.CpSolver:
        # Solve the model.
        solver = cp_model.CpSolver()
        solution_printer = cp_model.ObjectiveSolutionPrinter()
        status = solver.Solve(model, solution_printer)

        # Print solution.
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return solver
        raise NoSolutionError
