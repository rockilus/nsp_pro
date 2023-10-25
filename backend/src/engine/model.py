#!/usr/bin/env python3
import json
from datetime import date, timedelta
from typing import Dict, List, Set, Tuple

from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import (
    Assignment,
    Constraint,
    Inputs,
    Request,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
)
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
        self.obj = Objective()
        self.solver = cp_model.CpSolver()
        self.solution_printer = cp_model.ObjectiveSolutionPrinter()
        self.status = 0

    def set_up_model(self, inputs: Inputs) -> None:
        self.build_variables()
        self.add_exactly_one_shift_per_day_constraint()
        self.add_coverage_constraints(inputs.coverage.coverage)
        self.add_custom_constraints(
            inputs.constraints, inputs.coverage.coverage
        )
        self.add_fixed_assignments(inputs.fixed_assignments)
        self.add_requests(inputs.requests)
        self.add_objective()

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
        date_format = "%Y-%m-%d"
        for shift_demand in coverage:
            c_variables: List[cp_model.IntVar] = [
                self.variables[
                    w,
                    shift_demand.date.strftime(date_format),
                    shift_demand.shift_id,
                ]
                for w in self.workers
            ]
            sum_var = self.model.NewIntVar(
                shift_demand.quantity, shift_demand.quantity, ""
            )
            self.model.Add(sum_var == sum(c_variables))

    def add_custom_constraints(
        self, constraints: List[Constraint], coverage: List[ShiftDemand]
    ) -> None:
        for constraint in constraints:
            if constraint.constraint_type == "sum":
                self._add_sum_constraint(constraint)
            elif constraint.constraint_type == "seq":
                self._add_seq_constraint(constraint)
            elif constraint.constraint_type == "ord":
                self._add_ord_constraint(constraint)
            elif constraint.constraint_type == "fil":
                self._add_fil_constraint(constraint)
            elif constraint.constraint_type == "fai":
                self._add_fai_constraint(constraint, coverage)
            elif constraint.constraint_type == "eve":
                self._add_eve_constraint(constraint, coverage)

    def add_fixed_assignments(
        self, fixed_assignments: List[Assignment]
    ) -> None:
        date_format = "%Y-%m-%d"
        for fa in fixed_assignments:
            w, d, s = fa.worker_id, fa.date.strftime(date_format), fa.shift_id
            self.model.Add(self.variables[w, d, s] == 1)

    def add_requests(self, requests: List[Request]) -> None:
        date_format = "%Y-%m-%d"
        for r in requests:
            w, d, s, p = (
                r.worker_id,
                r.date.strftime(date_format),
                r.shift_id,
                r.penalty,
            )
            cstr_vars: List[cp_model.IntVar] = [self.variables[w, d, s]]
            var_name = json.dumps(
                {
                    "constraint_id": r.id,
                    "cstr_vars": [var.Name() for var in cstr_vars],
                }
            )
            lit = self.model.NewBoolVar(var_name)
            cstr_vars.append(lit)
            self.model.AddBoolOr(cstr_vars)
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(p)

    def _add_sum_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self._get_vars_coordinates_sum(constraint)
        for w in w_vars:
            for s in s_vars:
                for period in d_vars:
                    constraint_vars = [self.variables[w, d, s] for d in period]
                    self._add_constraint_sum_to_model(
                        constraint, constraint_vars
                    )

    def _add_seq_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self._get_vars_coordinates_seq(constraint)
        for w in w_vars:
            for s in s_vars:
                constraint_vars = []
                for d in d_vars:
                    constraint_vars.append(self.variables[w, d, s])
            self._add_constraint_seq_to_model(constraint, constraint_vars)

    def _add_ord_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars = self._get_vars_coordinates_ord(constraint)
        for w in w_vars:
            for d1, d2 in d_vars:
                constraint_vars = [
                    self.variables[w, d1, constraint.shift_var.reference],
                    self.variables[w, d2, constraint.shift_var.relative],
                ]
                self._add_constraint_ord_to_model(constraint, constraint_vars)

    def _add_fil_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self._get_vars_coordinates_fil(constraint)
        for w in w_vars:
            for d in d_vars:
                for s in s_vars:
                    self._add_constraint_fil_to_model(
                        constraint, self.variables[w, d, s]
                    )

    def _add_fai_constraint(
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
            [self.variables[w, d, s] for d in d_vars for s in s_vars]
            for w in w_vars
        ]
        target_average = Model._get_average_nb_shifts_per_worker(
            coverage, len(w_vars), d_vars, s_vars
        )

        for constraint_vars in constraints_vars:
            self._add_constraint_fai_to_model(
                constraint, constraint_vars, target_average
            )

    def _add_eve_constraint(
        self, constraint: Constraint, coverage: List[ShiftDemand]
    ) -> None:
        shifts_in_coverage = set(
            shift_demand.shift_id
            for shift_demand in coverage
            if shift_demand.quantity > 0
        )
        w_vars, d_vars, s_vars = self._get_vars_coordinates_eve(
            constraint, shifts_in_coverage
        )
        target_average = Model._get_average_nb_shifts_per_worker(
            coverage,
            constraint.worker_var.num_eligible_workers,
            d_vars,
            s_vars,
        )
        period_lengths = Model.integer_division_list(
            len(self.days), int(target_average)
        )
        for w in w_vars:
            constraints_sum = self.convert_constraint_eve_to_constraints_sum(
                constraint, w, s_vars[0], period_lengths
            )
            for constraint_sum in constraints_sum:
                self._add_sum_constraint(constraint_sum)

    def _get_vars_coordinates_sum(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[List[str]], List[str]]:
        date_format = "%Y-%m-%d"
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        elif constraint.worker_var.selector == "equal":
            w_vars = constraint.worker_var.target
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = [self.days]
        elif constraint.day_var.selector == "week":
            week_length = 7
            d_indexes = [
                list(range(i, i + 7))
                for i in range(
                    0,
                    len(self.days),
                    week_length,
                )
            ]
            d_vars = [[self.days[i] for i in d_index] for d_index in d_indexes]
        elif constraint.day_var.selector == "period":
            period = [
                constraint.day_var.start_date + timedelta(days=i)
                for i in range(
                    (
                        constraint.day_var.end_date
                        - constraint.day_var.start_date
                    ).days
                    + 1
                )
            ]
            d_vars = [
                [
                    day.strftime(date_format)
                    for day in period
                    if day.strftime(date_format) in self.days
                ]
            ]
        else:
            raise NotImplementedError(
                f"Day selector {constraint.day_var.selector} "
                + "not implemented"
            )
        if constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _get_vars_coordinates_seq(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[str], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
            )
        d_vars = self.days
        if constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _get_vars_coordinates_ord(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[List[str]]]:
        week_length = 7
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
            )
        d_vars: List[List[str]] = []
        if constraint.day_var.selector == "all":
            for i in range(
                abs(min(constraint.day_var.interval, 0)),
                len(self.days) - max(constraint.day_var.interval, 0),
            ):
                d_vars.append(
                    [self.days[i], self.days[i + constraint.day_var.interval]]
                )
        elif constraint.day_var.selector == "week_day_index":
            start = (
                constraint.day_var.target
                if (
                    constraint.day_var.target + constraint.day_var.interval
                    >= 0
                )
                else constraint.day_var.target + week_length
            )
            for i in range(
                start,
                len(self.days) - max(constraint.day_var.interval, 0),
                week_length,
            ):
                d_vars.append(
                    [
                        self.days[i],
                        self.days[i + constraint.day_var.interval],
                    ]
                )
        else:
            raise NotImplementedError(
                f"Day selector {constraint.day_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars

    def _get_vars_coordinates_fil(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[str], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        elif constraint.worker_var.selector == "equal":
            if constraint.worker_var.operator == "in_target":
                w_vars = constraint.worker_var.target
            elif constraint.worker_var.operator == "out_target":
                w_vars = [
                    w
                    for w in self.workers
                    if w not in constraint.worker_var.target
                ]
            else:
                raise NotImplementedError(
                    f"Worker operator {constraint.worker_var.operator} "
                    + "not implemented"
                )
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = self.days
        if constraint.shift_var.selector == "all":
            s_vars = self.shifts
        elif constraint.shift_var.selector == "equal":
            if constraint.shift_var.operator == "in_target":
                s_vars = constraint.shift_var.target
            elif constraint.shift_var.operator == "out_target":
                s_vars = [
                    s
                    for s in self.shifts
                    if s not in constraint.shift_var.target
                ]
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars, s_vars

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
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
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
                f"Shift selector {constraint.shift_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _get_vars_coordinates_eve(
        self, constraint: Constraint, shifts_in_coverage: Set[str]
    ) -> Tuple[List[str], List[str], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        elif constraint.worker_var.selector == "equal":
            w_vars = constraint.worker_var.target
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} "
                + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = self.days
        if constraint.shift_var.selector == "all":
            s_vars = [s for s in self.shifts if s in shifts_in_coverage]
        elif constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} "
                + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _add_constraint_sum_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                sum_var = self.model.NewIntVar(0, constraint.target_value, "")
            elif constraint.operator == "equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value,
                    constraint.target_value,
                    "",
                )
            elif constraint.operator == "greater_than_or_equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value, len(cstr_vars), ""
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(cstr_vars))
        else:
            if constraint.penalty != 0:
                var_name = json.dumps(
                    {
                        "constraint_id": constraint.id,
                        "cstr_vars": [var.Name() for var in cstr_vars],
                    }
                )
                if constraint.operator == "less_than_or_equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint.target_value
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint.target_value
                    )
                    excess = self.model.NewIntVar(
                        -len(cstr_vars),
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "greater_than_or_equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == constraint.target_value - sum(cstr_vars)
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)

    def _add_constraint_seq_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == "equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == "greater_than_or_equal":
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
        else:
            if constraint.penalty != 0:
                if constraint.operator == "less_than_or_equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                elif constraint.operator == "equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                elif constraint.operator == "greater_than_or_equal":
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )

    def _add_constraint_seq_less_than_or_equal_hard_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for start in range(len(cstr_vars) - constraint.target_value):
            self.model.AddBoolOr(
                [
                    cstr_vars[i].Not()
                    for i in range(start, start + constraint.target_value + 1)
                ]
            )

    def _add_constraint_seq_greater_than_or_equal_hard_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint.target_value):
            for start in range(len(cstr_vars) - length + 1):
                self.model.AddBoolOr(
                    self._negated_bounded_span(cstr_vars, start, length)
                )

    def _add_constraint_seq_less_than_or_equal_soft_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(constraint.target_value + 1, len(cstr_vars) + 1):
            for start in range(len(cstr_vars) - length + 1):
                span = Model._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = json.dumps(
                    {
                        "constraint_id": constraint.id,
                        "cstr_vars": [
                            var.Not().Name()
                            for var in span
                            if isinstance(var, cp_model._NotBooleanVariable)
                        ],
                    }
                )
                lit = self.model.NewBoolVar(var_name)
                span.append(lit)
                self.model.AddBoolOr(span)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(
                    constraint.penalty * (length - constraint.target_value)
                )

    def _add_constraint_seq_greater_than_or_equal_soft_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint.target_value):
            for start in range(len(cstr_vars) - length + 1):
                span = Model._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = json.dumps(
                    {
                        "constraint_id": constraint.id,
                        "cstr_vars": [
                            var.Not().Name()
                            for var in span
                            if isinstance(var, cp_model._NotBooleanVariable)
                        ],
                    }
                )
                lit = self.model.NewBoolVar(var_name)
                span.append(lit)
                self.model.AddBoolOr(span)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(
                    constraint.penalty * (constraint.target_value - length)
                )

    def _add_constraint_ord_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "yes":
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == "no":
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)
        else:
            if constraint.penalty != 0:
                var_name = json.dumps(
                    {
                        "constraint_id": constraint.id,
                        "cstr_vars": [var.Name() for var in cstr_vars],
                    }
                )
                if constraint.operator == "yes":
                    transition = [cstr_vars[0].Not(), cstr_vars[1]]
                elif constraint.operator == "no":
                    transition = [cstr_var.Not() for cstr_var in cstr_vars]
                else:
                    raise NotImplementedError(
                        f"Sum constraint operator {constraint.operator} "
                        + "not implemented"
                    )
                trans_var = self.model.NewBoolVar(var_name)
                transition.append(trans_var)
                self.model.AddBoolOr(transition)
                self.obj.bool_vars.append(trans_var)
                self.obj.bool_coeffs.append(constraint.penalty)

    def _add_constraint_fil_to_model(
        self, constraint: Constraint, cstr_var: cp_model.IntVar
    ) -> None:
        if constraint.hard:
            self.model.Add(cstr_var == 0)
        else:
            if constraint.penalty != 0:
                cstr_vars: List[cp_model.IntVar] = [cstr_var]
                var_name = json.dumps(
                    {
                        "constraint_id": constraint.id,
                        "cstr_vars": [var.Name() for var in cstr_vars],
                    }
                )
                cstr_vars = [var.Not() for var in cstr_vars]
                lit = self.model.NewBoolVar(var_name)
                cstr_vars.append(lit)
                self.model.AddBoolOr(cstr_vars)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(constraint.penalty)

    def _add_constraint_fai_to_model(
        self,
        constraint: Constraint,
        cstr_vars: List[cp_model.IntVar],
        target_average: float,
    ) -> None:
        if constraint.penalty != 0:
            target_average_int = int(target_average)
            var_name = json.dumps(
                {
                    "constraint_id": constraint.id,
                    "cstr_vars": [var.Name() for var in cstr_vars],
                }
            )
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
                delta = self.model.NewIntVar(
                    -len(cstr_vars), len(cstr_vars), ""
                )
                self.model.Add(
                    delta == sum(cstr_vars) - target_average_int - 1
                )
                excess = self.model.NewIntVar(
                    -len(cstr_vars),
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)

    def convert_constraint_eve_to_constraints_sum(
        self,
        constraint: Constraint,
        target_worker: str,
        target_shift: str,
        period_lengths: List[int],
    ) -> List[Constraint]:
        constraints_sum = []
        for index, period_length in enumerate(period_lengths):
            cum_days = sum(period_lengths[:index])
            start_date = date.fromisoformat(self.days[0]) + timedelta(
                days=cum_days
            )
            end_date = start_date + timedelta(days=period_length - 1)
            constraints_sum.append(
                Constraint(
                    id=constraint.id,
                    constraint_type="sum",
                    operator="less_than_or_equal",
                    target_value=1,
                    worker_var=VarWorker(
                        operator="",
                        selector="equal",
                        target=[target_worker],
                        num_eligible_workers=0,
                    ),
                    day_var=VarDay(
                        selector="period",
                        target=0,
                        start_date=start_date,
                        end_date=end_date,
                        interval=0,
                    ),
                    shift_var=VarShift(
                        operator="",
                        selector="equal",
                        target=[target_shift],
                        reference="",
                        relative="",
                    ),
                    hard=False,
                    penalty=constraint.penalty,
                )
            )
        return constraints_sum

    @staticmethod
    def _negated_bounded_span(
        cstr_vars: List[cp_model.IntVar], start: int, length: int
    ) -> List[cp_model.IntVar]:
        sequence = []
        if start > 0:
            sequence.append(cstr_vars[start - 1])
        for i in range(length):
            sequence.append(cstr_vars[start + i].Not())
        if start + length < len(cstr_vars):
            sequence.append(cstr_vars[start + length])
        return sequence

    @staticmethod
    def _get_total_coverage_shift(
        coverage: List[ShiftDemand], shift_id: str, days: List[str]
    ) -> int:
        date_format = "%Y-%m-%d"
        return sum(
            shift_demand.quantity
            for shift_demand in coverage
            if shift_demand.shift_id == shift_id
            and shift_demand.date.strftime(date_format) in days
        )

    @staticmethod
    def _get_average_nb_shifts_per_worker(
        coverage: List[ShiftDemand],
        num_eligible_workers: int,
        days: List[str],
        shifts: List[str],
    ) -> float:
        total_coverage = sum(
            Model._get_total_coverage_shift(coverage, s, days) for s in shifts
        )
        target_average = total_coverage / num_eligible_workers
        return target_average

    @staticmethod
    def integer_division_list(numerator: int, denominator: int) -> List[int]:
        quotient = numerator // denominator
        remainder = numerator % denominator
        result = [quotient + 1] * remainder + [quotient] * (
            denominator - remainder
        )
        return result

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
        params = "max_time_in_seconds:10.0"
        if params:
            text_format.Parse(params, self.solver.parameters)
        self.status = self.solver.Solve(self.model, self.solution_printer)
