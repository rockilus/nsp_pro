#!/usr/bin/env python3
from ortools.sat.python import cp_model  # type: ignore
from solver.build_model import BuildModel


class ModelSolver:
    def __init__(self, build_model: BuildModel) -> None:
        self.model = build_model.model
        self.work = build_model.work
        self.obj_int_vars = build_model.obj_int_vars
        self.obj_int_coeffs = build_model.obj_int_coeffs
        self.obj_bool_vars = build_model.obj_bool_vars
        self.obj_bool_coeffs = build_model.obj_bool_coeffs
        self.solver = cp_model.CpSolver()
        self.solution_printer = cp_model.ObjectiveSolutionPrinter()
        self.status = 0

    def solve(self) -> None:
        self.status = self.solver.Solve(self.model, self.solution_printer)

    def print_solution(self) -> None:
        shifts = ["O", "M", "A", "N"]

        if self.status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            print()
            header = "          "
            # for w in range(num_weeks):
            for _ in range(2):
                header += "M T W T F S S "
            print(header)
            # for e in range(num_employees):
            for e in range(8):
                schedule = ""
                # for d in range(num_days):
                for d in range(14):
                    # for s in range(num_shifts):
                    for s in range(4):
                        if self.solver.BooleanValue(self.work[e, d, s]):
                            schedule += shifts[s] + " "
                print(f"worker {e}: {schedule}")
            print()
            print("Penalties:")
            for i, var in enumerate(self.obj_bool_vars):
                if self.solver.BooleanValue(var):
                    penalty = self.obj_bool_coeffs[i]
                    if penalty > 0:
                        print(f"  {var.Name()} violated, penalty={penalty}")
                    else:
                        print(f"  {var.Name()} fulfilled, gain={-penalty}")

            for i, var in enumerate(self.obj_int_vars):
                if self.solver.Value(var) > 0:
                    print(
                        # pylint: disable=line-too-long
                        f"  {var.Name()} violated by {self.solver.Value(var)}, linear penalty={self.obj_int_coeffs[i]}"  # noqa: E501
                    )

        print()
        print("Statistics")
        print(f"  - status          : {self.solver.StatusName(self.status)}")
        print(f"  - conflicts       : {self.solver.NumConflicts()}")
        print(f"  - branches        : {self.solver.NumBranches()}")
        print(f"  - wall time       : {self.solver.WallTime()} s")
        print(f"  - objective value : {self.solver.ObjectiveValue()}")
        # print(f"  - best bound      : {self.solver.BestObjectiveBound()}")

        # print(f"  - response stats  : {self.solver.ResponseStats()}")
