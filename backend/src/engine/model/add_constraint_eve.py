from datetime import date, timedelta
from typing import Dict, List, Set, Tuple

from ortools.sat.python import cp_model

from engine.model.add_constraint_sum import AddConstraintSum
from engine.model.utils.model_utils import get_average_nb_shifts_per_worker
from engine.types.input_output_types import (
    Constraint,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
)
from engine.types.model_types import Objective


class AddConstraintEve:
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

        self.add_constraint_sum = AddConstraintSum(
            self.model,
            self.variables,
            self.workers,
            self.days,
            self.obj,
        )

    def add_constraint(
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
        target_average = get_average_nb_shifts_per_worker(
            coverage,
            constraint.worker_var.num_eligible_workers,
            d_vars,
            s_vars,
        )
        period_lengths = AddConstraintEve.integer_division_list(
            len(self.days), int(target_average)
        )
        for w in w_vars:
            constraints_sum = self.convert_constraint_eve_to_constraints_sum(
                constraint, w, s_vars[0], period_lengths
            )
            for constraint_sum in constraints_sum:
                self.add_constraint_sum.add_constraint(constraint_sum)

    def _get_vars_coordinates_eve(
        self, constraint: Constraint, shifts_in_coverage: Set[str]
    ) -> Tuple[List[str], List[str], List[str]]:
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
        if constraint.shift_var.selector == "all":
            s_vars = [s for s in self.shifts if s in shifts_in_coverage]
        elif constraint.shift_var.selector == "equal":
            s_vars = constraint.shift_var.target
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
            )
        return w_vars, d_vars, s_vars

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
            start_date = date.fromisoformat(self.days[0]) + timedelta(days=cum_days)
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
                    hard_to_soft=constraint.hard_to_soft,
                    penalty=constraint.penalty,
                )
            )
        return constraints_sum

    @staticmethod
    def integer_division_list(numerator: int, denominator: int) -> List[int]:
        quotient = numerator // denominator
        remainder = numerator % denominator
        result = [quotient + 1] * remainder + [quotient] * (denominator - remainder)
        return result
