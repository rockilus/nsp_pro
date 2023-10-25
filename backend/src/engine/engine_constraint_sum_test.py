from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.engine_test import TestEngine
from engine.inputs_outputs import (
    Constraint,
    Inputs,
    Outputs,
    VarWorker,
    VarDay,
    VarShift,
)


# pylint: disable=R0801
class TestConstraint:
    @pytest.fixture
    def constraint_sum_hard(self) -> Constraint:
        return Constraint(
            id="constraint_sum_hard",
            constraint_type="sum",
            operator="less_than_or_equal",
            target_value=4,
            worker_var=VarWorker(
                operator="", selector="all", target=[], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week",
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
            hard=True,
            penalty=0,
        )

    @pytest.fixture
    def constraint_sum_soft(self) -> Constraint:
        return Constraint(
            id="constraint_sum_soft",
            constraint_type="sum",
            operator="less_than_or_equal",
            target_value=2,
            worker_var=VarWorker(
                operator="", selector="all", target=[], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="week",
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
            penalty=20,
        )


class TestConstraintHard(TestEngine, TestConstraint):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
    ) -> None:
        # At most 4 shift off per week
        inputs.constraints = [constraint_sum_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum_hard.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
    ) -> None:
        # Exactly 4 shift off per week
        constraint_sum_hard.operator = "equal"
        inputs.constraints = [constraint_sum_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(
            count == constraint_sum_hard.target_value for count in counts
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
    ) -> None:
        # At least 4 shift off per week
        constraint_sum_hard.operator = "greater_than_or_equal"
        inputs.constraints = [constraint_sum_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum_hard.target_value

    def test_expected_assignment_for_equal_worker_equal_day_all_shift_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
    ) -> None:
        # Worker w0 works 4 times shift s0
        constraint_sum_hard.operator = "equal"
        constraint_sum_hard.worker_var.selector = "equal"
        constraint_sum_hard.worker_var.target = ["w0"]
        constraint_sum_hard.day_var.selector = "all"
        inputs.constraints = [constraint_sum_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count = sum(
            1
            for a in assignments
            if a.worker_id in constraint_sum_hard.worker_var.target
            and a.shift_id in constraint_sum_hard.shift_var.target
        )

        assert count == constraint_sum_hard.target_value

    def test_expected_assignment_for_equal_worker_equal_day_period_shift_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
    ) -> None:
        # Worker w0 works 4 times shift s0 during first week (between
        # 2023-10-02 and 2023-10-08)
        constraint_sum_hard.operator = "equal"
        constraint_sum_hard.worker_var.selector = "equal"
        constraint_sum_hard.worker_var.target = ["w0"]
        constraint_sum_hard.day_var.selector = "period"
        constraint_sum_hard.day_var.start_date = date.fromisoformat(
            "2023-10-02"
        )
        constraint_sum_hard.day_var.end_date = date.fromisoformat("2023-10-08")
        inputs.constraints = [constraint_sum_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count = sum(
            1
            for a in assignments
            if a.worker_id in constraint_sum_hard.worker_var.target
            and a.date
            in build_day_list(
                constraint_sum_hard.day_var.start_date,
                constraint_sum_hard.day_var.end_date,
            )
            and a.shift_id in constraint_sum_hard.shift_var.target
        )

        assert count == constraint_sum_hard.target_value


class TestConstraintSoft(TestEngine, TestConstraint):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_soft: Constraint,
    ) -> None:
        # At most 4 shift off per week
        inputs.constraints = [constraint_sum_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_soft.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum_soft.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_soft: Constraint,
    ) -> None:
        # Exactly 4 shift off per week
        constraint_sum_soft.operator = "equal"
        inputs.constraints = [constraint_sum_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_soft.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(
            count == constraint_sum_soft.target_value for count in counts
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_soft: Constraint,
    ) -> None:
        # At least 4 shift off per week
        constraint_sum_soft.operator = "greater_than_or_equal"
        inputs.constraints = [constraint_sum_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_soft.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum_soft.target_value

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
        constraint_sum_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        constraint_sum_hard.operator = "equal"
        inputs.constraints = [
            constraint_sum_hard,
            constraint_sum_soft,
        ]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.constraints[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id in constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(
            count == constraint_sum_hard.target_value for count in counts
        )

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
        constraint_sum_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        constraint_sum_hard.operator = "equal"
        inputs.constraints = [
            constraint_sum_hard,
            constraint_sum_soft,
        ]
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        assert outputs.objective_value == constraint_sum_soft.penalty * len(
            inputs.variable_space.workers
        ) * len(dates_weeks) * abs(
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
        constraint_sum_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        constraint_sum_hard.operator = "equal"
        inputs.constraints = [
            constraint_sum_hard,
            constraint_sum_soft,
        ]
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )

        expected_variables = [
            [[w, d, s] for d in week]
            for w in inputs.variable_space.workers
            for week in dates_weeks
            for s in constraint_sum_hard.shift_var.target
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            any(
                cb_variable in exp_variables
                for exp_variables in expected_variables
            )
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(
                exp_variable in cb.variables
                for cb in outputs.constraint_breaches
            )
            for exp_variables in expected_variables
            for exp_variable in exp_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_sum_hard: Constraint,
        constraint_sum_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        constraint_sum_hard.operator = "equal"
        inputs.constraints = [
            constraint_sum_hard,
            constraint_sum_soft,
        ]
        outputs = engine_solve(inputs)

        expected_value_diff = (
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

        assert all(
            cb.value_diff == expected_value_diff
            for cb in outputs.constraint_breaches
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


def build_day_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
