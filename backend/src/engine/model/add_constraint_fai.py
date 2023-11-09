from typing import Dict, List, Set, Tuple

from ortools.sat.python import cp_model

from engine.model.utils.model_utils import (
    build_var_name,
    get_average_nb_shifts_per_worker,
)
from engine.types.input_output_types import Constraint, ShiftDemand
from engine.types.model_types import Objective


class AddConstraintFai:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
        days: List[str],
        shifts: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.days = days
        self.shifts = shifts
        self.obj = obj

    def add_constraint(
        self, constraint: Constraint, coverage: List[ShiftDemand]
    ) -> None:
        shifts_in_coverage = set(
            shift_demand.shift_id
            for shift_demand in coverage
            if shift_demand.quantity > 0
        )
        w_vars, d_vars, s_vars = self._get_vars_coordinates_fai(
            constraint, shifts_in_coverage
        )
        constraints_vars = [
            [self.variables[w, d, s] for d in d_vars for s in s_vars] for w in w_vars
        ]
        target_average = get_average_nb_shifts_per_worker(
            coverage, len(w_vars), d_vars, s_vars
        )

        for constraint_vars in constraints_vars:
            self._add_constraint_fai_to_model(
                constraint, constraint_vars, target_average
            )

    def _get_vars_coordinates_fai(
        self, constraint: Constraint, shifts_in_coverage: Set[str]
    ) -> Tuple[List[str], List[str], List[str]]:
        week_length = 7
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        elif constraint.worker_var.selector == "equal":
            w_vars = constraint.worker_var.target
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = self.days
        elif constraint.day_var.selector == "week_day_index":
            d_vars = [
                self.days[i]
                for i in range(
                    constraint.day_var.target,
                    len(self.days),
                    week_length,
                )
            ]
        if constraint.shift_var.selector == "all":
            s_vars = [s for s in self.shifts if s in shifts_in_coverage]
        elif constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _add_constraint_fai_to_model(
        self,
        constraint: Constraint,
        cstr_vars: List[cp_model.IntVar],
        target_average: float,
    ) -> None:
        if constraint.penalty != 0:
            target_average_int = int(target_average)
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
            self.model.Add(delta == sum(cstr_vars) - target_average_int)
            excess = self.model.NewIntVar(
                -len(cstr_vars),
                len(cstr_vars),
                var_name,
            )
            self.model.AddAbsEquality(excess, delta)
            self.obj.int_vars.append(excess)
            self.obj.int_coeffs.append(constraint.penalty)
            if target_average != target_average_int:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == sum(cstr_vars) - target_average_int - 1)
                excess = self.model.NewIntVar(
                    -len(cstr_vars),
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)
