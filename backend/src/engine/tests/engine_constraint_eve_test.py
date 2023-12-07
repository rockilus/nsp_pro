from datetime import date, datetime
from typing import Callable, List

import pytest

from engine.tests.engine_test import TestEngine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Assignment,
    Constraint,
    Coverage,
    Inputs,
    Outputs,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
)
from utils.constants import Constants


# pylint: disable=R0801, R0903
class TestConstraint:
    @pytest.fixture
    def constraint_eve_soft(self) -> Constraint:
        return Constraint(
            id="constraint_eve_soft",
            constraint_type="eve",
            operator="",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="equal",
                target=["w0"],
                num_eligible_workers=8,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="equal",
                target=["s0"],
                reference="",
                relative="",
            ),
            hard=False,
            hard_to_soft=False,
            penalty=1,
        )

    @pytest.fixture
    def constraint_fai_soft(self) -> Constraint:
        return Constraint(
            id="constraint_fai_soft",
            constraint_type="fai",
            operator="",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                operator="",
                selector="all",
                target=[],
                num_eligible_workers=0,
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                operator="",
                selector="all",
                target=[],
                reference="",
                relative="",
            ),
            hard=False,
            hard_to_soft=False,
            penalty=2,
        )


class TestConstraintSoft(TestEngine, TestConstraint):
    # pylint: disable=too-many-locals
    def test_expected_assignment(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0
        target_shifts = ["s0"]
        quantity = 3
        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        num_days = len(inputs.variable_space.days)
        target_count = (
            quantity
            * num_days
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        period_lengths = integer_division_list(num_days, target_count)
        counts = []
        for i, p_len in enumerate(period_lengths):
            cum_days = sum(period_lengths[:i])
            dates = [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT)
                for d in inputs.variable_space.days[cum_days : cum_days + p_len]
            ]
            count = sum(
                1
                for a in assignments
                if a.worker_id == constraint_eve_soft.worker_var.target
                and a.date in dates
                and a.shift_id == constraint_eve_soft.shift_var.target
            )
            counts.append(count)

        assert all(count <= 1 for count in counts)

    # pylint: disable=too-many-locals
    def test_expected_assignment_with_fixed_assignment(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0. One fixed
        # assignment that doesn't conflict with constraint
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            )
        ]
        target_shifts = ["s0"]
        quantity = 3
        inputs.fixed_assignments = fixed_assignments
        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        num_days = len(inputs.variable_space.days)
        target_count = (
            quantity
            * num_days
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        period_lengths = integer_division_list(num_days, target_count)
        counts = []
        for i, p_len in enumerate(period_lengths):
            cum_days = sum(period_lengths[:i])
            dates = [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT)
                for d in inputs.variable_space.days[cum_days : cum_days + p_len]
            ]
            count = sum(
                1
                for a in assignments
                if a.worker_id == constraint_eve_soft.worker_var.target
                and a.date in dates
                and a.shift_id == constraint_eve_soft.shift_var.target
            )
            counts.append(count)

        assert all(count <= 1 for count in counts)

    # pylint: disable=too-many-locals
    def test_expected_assignment_with_fixed_assignment_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0. Two fixed
        # assignments that conflict with constraint
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
            ),
        ]
        target_shifts = ["s0"]
        quantity = 3
        inputs.fixed_assignments = fixed_assignments
        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        num_days = len(inputs.variable_space.days)
        target_count = (
            quantity
            * num_days
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        period_lengths = integer_division_list(num_days, target_count)
        counts = []
        for i, p_len in enumerate(period_lengths):
            cum_days = sum(period_lengths[:i])
            dates = [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days[cum_days : cum_days + p_len]
            ]
            count = sum(
                1
                for a in assignments
                if a.worker_id in constraint_eve_soft.worker_var.target
                and a.date in dates
                and a.shift_id in constraint_eve_soft.shift_var.target
            )
            counts.append(count)

        # One count is greater than 1
        greater_than_one = [count for count in counts if count > 1]
        assert len(greater_than_one) == 1

        # All other counts are less than or equal to 1
        less_than_or_equal_to_one = [count for count in counts if count <= 1]
        assert len(less_than_or_equal_to_one) == len(counts) - 1

    def test_expected_objective_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0
        target_shifts = ["s0"]
        quantity = 3
        inputs.constraints = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs_ex_eve = engine_solve(inputs)
        objective_ex_eve = outputs_ex_eve.objective_value

        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        outputs_with_eve = engine_solve(inputs)
        objective_with_eve = outputs_with_eve.objective_value

        objective_eve = objective_with_eve - objective_ex_eve

        assert objective_eve == 0

    def test_expected_objective_with_fixed_assignment_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0. Two fixed
        # assignments that conflict with constraint
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
            ),
        ]
        target_shifts = ["s0"]
        quantity = 3
        inputs.fixed_assignments = fixed_assignments
        inputs.constraints = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs_ex_eve = engine_solve(inputs)
        objective_ex_eve = outputs_ex_eve.objective_value

        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        outputs_with_eve = engine_solve(inputs)
        objective_with_eve = outputs_with_eve.objective_value

        objective_eve = objective_with_eve - objective_ex_eve

        assert objective_eve == constraint_eve_soft.penalty

    # pylint: disable=too-many-locals
    def test_expected_constraint_breaches_with_fixed_assignment_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: Constraint,
        constraint_eve_soft: Constraint,
    ) -> None:
        # Total demand of 42 shifts s0 across 8 workers, i.e. 5.25 shifts per
        # worker. Shifts must be spread evenly for worker w0. Two fixed
        # assignments that conflict with constraint
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
            ),
        ]
        target_shifts = ["s0"]
        quantity = 3
        inputs.fixed_assignments = fixed_assignments
        inputs.constraints = [constraint_fai_soft, constraint_eve_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.days, target_shifts, quantity
        )
        outputs = engine_solve(inputs)

        num_days = len(inputs.variable_space.days)
        target_count = (
            quantity
            * num_days
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        period_lengths = integer_division_list(num_days, target_count)
        target_days = [
            datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
            for d in inputs.variable_space.days[: period_lengths[0]]
        ]

        expected_variables = [
            (w, d, s)
            for w in constraint_eve_soft.worker_var.target
            for d in target_days
            for s in constraint_eve_soft.shift_var.target
        ]

        constraint_breaches_eve = [
            breach
            for breach in outputs.constraint_breaches
            if breach.constraint_id == constraint_eve_soft.id
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            cb_variable in expected_variables
            for cb in constraint_breaches_eve
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(exp_variable in cb.variables for cb in constraint_breaches_eve)
            for exp_variable in expected_variables
        )


def build_coverage(
    days: List[str], target_shifts: List[str], quantity: int
) -> Coverage:
    coverage = []
    for d_str in days:
        cur_date = datetime.strptime(d_str, Constants.ENGINE_STRING_DATE_FORMAT).date()
        for s in target_shifts:
            coverage.append(
                ShiftDemand(
                    date=cur_date,
                    shift_id=s,
                    staffing=quantity,
                )
            )

    return Coverage(coverage=coverage)


def integer_division_list(numerator: int, denominator: int) -> List[int]:
    quotient = numerator // denominator
    remainder = numerator % denominator
    result = [quotient + 1] * remainder + [quotient] * (denominator - remainder)
    return result
