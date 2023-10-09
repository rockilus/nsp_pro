#!/usr/bin/env python3
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import ShiftDemand, Custom, ConstraintSum
from engine.types import Objective

import json


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
        self.obj = Objective()
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

    def add_custom_constraints(self, custom: Custom) -> None:
        self._add_sum_constraints(custom.constraints_sum)

    def _add_sum_constraints(
        self, constraints_sum: List[ConstraintSum]
    ) -> None:
        for constraint_sum in constraints_sum:
            if constraint_sum.worker_var.selector == "all":
                w_vars = self.workers
            else:
                raise NotImplementedError(
                    f"Worker selector {constraint_sum.worker_var.selector} not implemented"
                )
            if constraint_sum.day_var.selector == "week":
                week_length = 7
                d_indexes = [
                    list(range(i, i + 7))
                    for i in range(
                        0,
                        len(self.days),
                        week_length,
                    )
                ]
                d_vars = [
                    [self.days[i] for i in d_index] for d_index in d_indexes
                ]
            else:
                raise NotImplementedError(
                    f"Day selector {constraint_sum.day_var.selector} not implemented"
                )
            if constraint_sum.shift_var.selector == "equal":
                s_vars = [constraint_sum.shift_var.target]
            else:
                raise NotImplementedError(
                    f"Shift selector {constraint_sum.shift_var.selector} not implemented"
                )
            constraints_vars = []
            for w in w_vars:
                for s in s_vars:
                    for week in d_vars:
                        constraint_vars = [
                            self.variables[w, d, s] for d in week
                        ]
                        constraints_vars.append(constraint_vars)
            if constraint_sum.hard:
                for cstr_vars in constraints_vars:
                    if constraint_sum.operator == "less_than_or_equal":
                        sum_var = self.model.NewIntVar(
                            0, constraint_sum.target_value, ""
                        )
                    elif constraint_sum.operator == "equal":
                        sum_var = self.model.NewIntVar(
                            constraint_sum.target_value,
                            constraint_sum.target_value,
                            "",
                        )
                    elif constraint_sum.operator == "greater_than_or_equal":
                        sum_var = self.model.NewIntVar(
                            constraint_sum.target_value, len(cstr_vars), ""
                        )
                    else:
                        raise NotImplementedError(
                            f"Sum constraint operator {constraint_sum.operator} not implemented"
                        )
                    self.model.Add(sum_var == sum(cstr_vars))
            else:
                if constraint_sum.penalty not in [0, None]:
                    for cstr_vars in constraints_vars:
                        if constraint_sum.operator == "less_than_or_equal":
                            delta = self.model.NewIntVar(
                                -len(cstr_vars), len(cstr_vars), ""
                            )
                            self.model.Add(
                                delta
                                == sum(cstr_vars) - constraint_sum.target_value
                            )
                            print("var name", cstr_vars[0].Name())
                            var_name = json.dumps(
                                {
                                    "constraint_id": constraint_sum.id,
                                    "cstr_vars": [
                                        var.Name() for var in cstr_vars
                                    ],
                                }
                            )
                            excess = self.model.NewIntVar(
                                0,
                                len(cstr_vars),
                                var_name,
                            )
                            self.model.AddMaxEquality(excess, [delta, 0])
                            self.obj.int_vars.append(excess)
                            self.obj.int_coeffs.append(constraint_sum.penalty)
                        elif constraint_sum.operator == "equal":
                            delta = self.model.NewIntVar(
                                -len(cstr_vars), len(cstr_vars), ""
                            )
                            self.model.Add(
                                delta
                                == sum(cstr_vars) - constraint_sum.target_value
                            )
                            excess = self.model.NewIntVar(
                                -len(cstr_vars),
                                len(cstr_vars),
                                "string to come for excess",
                            )
                            self.model.AddMaxEquality(excess, [delta, 0])
                            self.obj.int_vars.append(excess)
                            self.obj.int_coeffs.append(constraint_sum.penalty)
                        elif (
                            constraint_sum.operator == "greater_than_or_equal"
                        ):
                            delta = self.model.NewIntVar(
                                -len(cstr_vars), len(cstr_vars), ""
                            )
                            self.model.Add(
                                delta
                                == constraint_sum.target_value - sum(cstr_vars)
                            )
                            excess = self.model.NewIntVar(
                                0,
                                len(cstr_vars),
                                "string to come for excess",
                            )
                            self.model.AddMaxEquality(excess, [delta, 0])
                            self.obj.int_vars.append(excess)
                            self.obj.int_coeffs.append(constraint_sum.penalty)

    def add_objective(self) -> None:
        self.model.Minimize(
            sum(
                self.obj.bool_vars[i] * self.obj.bool_coeffs[i]
                for i in range(len(self.obj.bool_vars))
            )
            + sum(
                self.obj.int_vars[i] * self.obj.int_coeffs[i]
                for i in range(len(self.obj.int_vars))
            )
        )

    def solve(self) -> cp_model.CpSolver:
        self.status = self.solver.Solve(self.model, self.solution_printer)
