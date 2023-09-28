#!/usr/bin/env python3
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore
from engine.inputs_outputs import ShiftDemand
from engine.types import Objective


class Model:
    # pylint: disable=too-many-instance-attributes
    def __init__(
        self, workers: List[str], days: List[str], shifts: List[str]
    ) -> None:
        self.workers = workers
        self.days = days
        self.shifts = shifts
        self.model = cp_model.CpModel()
        self.variables: Dict[Tuple, Dict] = {}
        self._obj = Objective()
        self.solver = cp_model.CpSolver()
        self.solution_printer = cp_model.ObjectiveSolutionPrinter()
        self.status = 0

    def build_variables(self) -> None:
        for worker in self.workers:
            for day in self.days:
                for shift in self.shifts:
                    self.variables[
                        (worker, day, shift)
                    ] = self.model.NewBoolVar(f"{worker}_{day}_{shift}")

    def add_exactly_one_shift_per_day_constraint(self) -> None:
        for worker in self.workers:
            for day in self.days:
                self.model.AddExactlyOne(
                    self.variables[worker, day, shift] for shift in self.shifts
                )

    def add_coverage_constraints(self, coverage: List[ShiftDemand]) -> None:
        for shift_demand in coverage:
            c_variables: List[cp_model.IntVar] = [
                self.variables[w, shift_demand.date, shift_demand.shift_id]
                for w in self.workers
            ]
            sum_var = self.model.NewIntVar(
                shift_demand.quantity, shift_demand.quantity, ""
            )
            self.model.Add(sum_var == sum(c_variables))

    def solve(self) -> cp_model.CpSolver:
        self.status = self.solver.Solve(self.model, self.solution_printer)
