from datetime import date, timedelta
from typing import List

from engine.model.add_constraint import AddConstraint
from engine.model.add_constraint_sum import AddConstraintSum
from engine.model.utils.model_utils import (
    build_shifts_in_coverage,
    get_average_nb_shifts_per_worker,
)
from engine.types.input_output_types import (
    Constraint,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
)


class AddConstraintEve(AddConstraint):
    # pylint: disable=too-many-arguments
    def __init__(
        self, model, variables, durations, workers, days, shifts, obj
    ) -> None:
        # pylint: disable=R0801
        super().__init__(
            model, variables, durations, workers, days, shifts, obj
        )
        self.add_constraint_sum = AddConstraintSum(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )

    def add_constraint(
        self, constraint: Constraint, coverage: List[ShiftDemand]
    ) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(
            constraint, build_shifts_in_coverage(coverage)
        )
        # pylint: disable=R0801
        if not all(isinstance(item, str) for item in d_vars):
            raise TypeError(
                "Expected a list of strings, "
                + f"but got {format(type(d_vars))} instead."
            )
        target_average = get_average_nb_shifts_per_worker(
            coverage,
            constraint.worker_var.num_eligible_workers,
            d_vars,  # type: ignore
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
                    target_unit="day",
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
        result = [quotient + 1] * remainder + [quotient] * (
            denominator - remainder
        )
        return result
