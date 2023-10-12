#!/usr/bin/env python3
import json
from typing import Dict, List, Tuple

from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore

from engine.inputs_outputs import (
    Assignment,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    Custom,
    Request,
    ShiftDemand,
)
from engine.types import Objective


class Model:
    # pylint: disable=too-many-instance-attributes
    def __init__(self, workers: List[str], days: List[str], shifts: List[str]) -> None:
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
                    self.variables[(worker, day, shift)] = self.model.NewBoolVar(
                        f"{worker}_{day}_{shift}"
                    )

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
        self._add_seq_constraints(custom.constraints_seq)
        self._add_ord_constraints(custom.constraints_ord)

    def add_fixed_assignments(self, fixed_assignments: List[Assignment]) -> None:
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

    def _add_sum_constraints(self, constraints_sum: List[ConstraintSum]) -> None:
        for constraint_sum in constraints_sum:
            w_vars, d_vars, s_vars = self._get_vars_coordinates_sum(constraint_sum)
            for w in w_vars:
                for s in s_vars:
                    for week in d_vars:
                        constraint_vars = [self.variables[w, d, s] for d in week]
                        self._add_constraint_sum_to_model(
                            constraint_sum, constraint_vars
                        )

    def _add_seq_constraints(self, constraints_seq: List[ConstraintSeq]) -> None:
        for constraint_seq in constraints_seq:
            w_vars, d_vars, s_vars = self._get_vars_coordinates_seq(constraint_seq)
            for w in w_vars:
                for s in s_vars:
                    constraint_vars = []
                    for d in d_vars:
                        constraint_vars.append(self.variables[w, d, s])
                self._add_constraint_seq_to_model(constraint_seq, constraint_vars)

    def _add_ord_constraints(self, constraints_ord: List[ConstraintOrd]) -> None:
        for constraint_ord in constraints_ord:
            w_vars, d_vars = self._get_vars_coordinates_ord(constraint_ord)
            for w in w_vars:
                for d1, d2 in d_vars:
                    constraint_vars = [
                        self.variables[w, d1, constraint_ord.shift_var.reference],
                        self.variables[w, d2, constraint_ord.shift_var.relative],
                    ]
                    self._add_constraint_ord_to_model(constraint_ord, constraint_vars)

    def _get_vars_coordinates_sum(
        self, constraint: ConstraintSum
    ) -> Tuple[List[str], List[List[str]], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        if constraint.day_var.selector == "week":
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
        else:
            raise NotImplementedError(
                f"Day selector {constraint.day_var.selector} " + "not implemented"
            )
        if constraint.shift_var.selector == "equal":
            s_vars = [constraint.shift_var.target]
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _get_vars_coordinates_seq(
        self, constraint: ConstraintSeq
    ) -> Tuple[List[str], List[str], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        d_vars = self.days
        if constraint.shift_var.selector == "equal":
            s_vars = [constraint.shift_var.target]
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _get_vars_coordinates_ord(
        self, constraint: ConstraintOrd
    ) -> Tuple[List[str], List[List[str]]]:
        week_length = 7
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
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
                if (constraint.day_var.target + constraint.day_var.interval >= 0)
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
                f"Day selector {constraint.day_var.selector} " + "not implemented"
            )
        return w_vars, d_vars

    def _add_constraint_sum_to_model(
        self, constraint_sum: ConstraintSum, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint_sum.hard:
            if constraint_sum.operator == "less_than_or_equal":
                sum_var = self.model.NewIntVar(0, constraint_sum.target_value, "")
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
                    f"Sum constraint operator {constraint_sum.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(cstr_vars))
        else:
            if constraint_sum.penalty != 0:
                var_name = json.dumps(
                    {
                        "constraint_id": constraint_sum.id,
                        "cstr_vars": [var.Name() for var in cstr_vars],
                    }
                )
                if constraint_sum.operator == "less_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint_sum.target_value
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
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint_sum.target_value
                    )
                    excess = self.model.NewIntVar(
                        -len(cstr_vars),
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint_sum.penalty)
                elif constraint_sum.operator == "greater_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(
                        delta == constraint_sum.target_value - sum(cstr_vars)
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint_sum.penalty)

    def _add_constraint_seq_to_model(
        self, constraint_seq: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint_seq.hard:
            if constraint_seq.operator == "less_than_or_equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint_seq, cstr_vars
                )
            elif constraint_seq.operator == "equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint_seq, cstr_vars
                )
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint_seq, cstr_vars
                )
            elif constraint_seq.operator == "greater_than_or_equal":
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint_seq, cstr_vars
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint_seq.operator} "
                    + "not implemented"
                )
        else:
            if constraint_seq.penalty != 0:
                if constraint_seq.operator == "less_than_or_equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint_seq, cstr_vars
                    )
                elif constraint_seq.operator == "equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint_seq, cstr_vars
                    )
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint_seq, cstr_vars
                    )
                elif constraint_seq.operator == "greater_than_or_equal":
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint_seq, cstr_vars
                    )

    def _add_constraint_seq_less_than_or_equal_hard_to_model(
        self, constraint_seq: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for start in range(len(cstr_vars) - constraint_seq.target_value):
            self.model.AddBoolOr(
                [
                    cstr_vars[i].Not()
                    for i in range(start, start + constraint_seq.target_value + 1)
                ]
            )

    def _add_constraint_seq_greater_than_or_equal_hard_to_model(
        self, constraint_seq: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint_seq.target_value):
            for start in range(len(cstr_vars) - length + 1):
                self.model.AddBoolOr(
                    self._negated_bounded_span(cstr_vars, start, length)
                )

    def _add_constraint_seq_less_than_or_equal_soft_to_model(
        self, constraint_seq: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(constraint_seq.target_value + 1, len(cstr_vars) + 1):
            for start in range(len(cstr_vars) - length + 1):
                span = Model._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = json.dumps(
                    {
                        "constraint_id": constraint_seq.id,
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
                    constraint_seq.penalty * (length - constraint_seq.target_value)
                )

    def _add_constraint_seq_greater_than_or_equal_soft_to_model(
        self, constraint_seq: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint_seq.target_value):
            for start in range(len(cstr_vars) - length + 1):
                span = Model._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = json.dumps(
                    {
                        "constraint_id": constraint_seq.id,
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
                    constraint_seq.penalty * (constraint_seq.target_value - length)
                )

    def _add_constraint_ord_to_model(
        self, constraint_ord: ConstraintOrd, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint_ord.hard:
            if constraint_ord.operator == "yes":
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint_ord.operator == "no":
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint_ord.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)
        else:
            if constraint_ord.penalty != 0:
                var_name = json.dumps(
                    {
                        "constraint_id": constraint_ord.id,
                        "cstr_vars": [var.Name() for var in cstr_vars],
                    }
                )
                if constraint_ord.operator == "yes":
                    transition = [cstr_vars[0].Not(), cstr_vars[1]]
                elif constraint_ord.operator == "no":
                    transition = [cstr_var.Not() for cstr_var in cstr_vars]
                else:
                    raise NotImplementedError(
                        f"Sum constraint operator {constraint_ord.operator} "
                        + "not implemented"
                    )
                trans_var = self.model.NewBoolVar(var_name)
                transition.append(trans_var)
                self.model.AddBoolOr(transition)
                self.obj.bool_vars.append(trans_var)
                self.obj.bool_coeffs.append(constraint_ord.penalty)

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
