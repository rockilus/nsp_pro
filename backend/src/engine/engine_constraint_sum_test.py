from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.engine_test import TestEngine
from engine.inputs_outputs import (
    ConstraintSum,
    Custom,
    Inputs,
    Outputs,
    VarSumDay,
    VarSumShift,
    VarSumWorker,
)


# pylint: disable=R0801
class TestConstraintSum:
    @pytest.fixture
    def custom_hard(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_hard",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                )
            ],
            constraints_seq=[],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_soft(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                )
            ],
            constraints_seq=[],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_hard_soft_conflict(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_hard",
                    operator="equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                ),
                ConstraintSum(
                    id="constraint_sum_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                ),
            ],
            constraints_seq=[],
            constraints_ord=[],
        )


class TestConstraintSumHard(TestEngine, TestConstraintSum):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At most 4 shift off per week
        inputs.custom = custom_hard
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = custom_hard.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        inputs.custom = custom_hard
        inputs.custom.constraints_sum[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum.target_value for count in counts)

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At least 4 shift off per week
        inputs.custom = custom_hard
        inputs.custom.constraints_sum[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum.target_value


class TestConstraintSumSoft(TestEngine, TestConstraintSum):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At most 4 shift off per week
        inputs.custom = custom_soft
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = custom_soft.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        inputs.custom = custom_soft
        inputs.custom.constraints_sum[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum.target_value for count in counts)

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At least 4 shift off per week
        inputs.custom = custom_soft
        inputs.custom.constraints_sum[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum.target_value

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum_hard.target_value for count in counts)

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]
        constraint_sum_soft = inputs.custom.constraints_sum[1]

        assert outputs.objective_value == constraint_sum_soft.penalty * len(
            inputs.variable_space.workers
        ) * len(dates_weeks) * abs(
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]

        expected_variables = [
            [[w, d, constraint_sum_hard.shift_var.target] for d in week]
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            any(cb_variable in exp_variables for exp_variables in expected_variables)
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(exp_variable in cb.variables for cb in outputs.constraint_breaches)
            for exp_variables in expected_variables
            for exp_variable in exp_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        constraint_sum_hard = inputs.custom.constraints_sum[0]
        constraint_sum_soft = inputs.custom.constraints_sum[1]

        expected_value_diff = (
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

        assert all(
            cb.value_diff == expected_value_diff for cb in outputs.constraint_breaches
        )


# pylint: disable=R0801
def get_dates_weeks(start_date: date, end_date: date) -> List[List[date]]:
    delta = end_date - start_date
    dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
    week_length = 7
    d_indexes = [
        list(range(i, i + 7))
        for i in range(
            0,
            len(dates),
            week_length,
        )
    ]
    dates_weeks = [[dates[i] for i in d_index] for d_index in d_indexes]
    return dates_weeks
