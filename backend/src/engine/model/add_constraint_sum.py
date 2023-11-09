from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model

from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint
from engine.types.model_types import Objective


class AddConstraintSum:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
        days: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.days = days
        self.obj = obj

    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self._get_vars_coordinates_sum(constraint)
        for w in w_vars:
            for s in s_vars:
                for period in d_vars:
                    constraint_vars = [self.variables[w, d, s] for d in period]
                    self._add_constraint_sum_to_model(constraint, constraint_vars)

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
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = [self.days]
        elif constraint.day_var.selector == "week":
            weekday_first_day = datetime.strptime(self.days[0], date_format).weekday()
            d_indexes = AddConstraintSum._build_weeks_day_index_list(
                weekday_first_day, len(self.days)
            )
            d_vars = [[self.days[i] for i in d_index] for d_index in d_indexes]
        elif constraint.day_var.selector == "period":
            period = [
                constraint.day_var.start_date + timedelta(days=i)
                for i in range(
                    (constraint.day_var.end_date - constraint.day_var.start_date).days
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
                f"Day selector {constraint.day_var.selector} " + "not implemented"
            )
        if constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
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
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "less_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                    excess = self.model.NewIntVar(
                        -len(cstr_vars),
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "greater_than_or_equal":
                    delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                    self.model.Add(delta == constraint.target_value - sum(cstr_vars))
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)

    @staticmethod
    def _build_weeks_day_index_list(
        first_day_index: int, num_days: int
    ) -> List[List[int]]:
        week_length = 7
        weeks = []
        week_start_index = 0
        while week_start_index < num_days:
            if week_start_index == 0:
                week_end_index = min(
                    week_start_index + week_length - first_day_index, num_days
                )
            else:
                week_end_index = min(week_start_index + week_length, num_days)
            weeks.append(list(range(week_start_index, week_end_index)))
            week_start_index = week_end_index
        return weeks
