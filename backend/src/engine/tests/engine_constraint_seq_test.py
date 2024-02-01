from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.tests.engine_test import TestEngine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Assignment,
    Constraint,
    Inputs,
    Outputs,
    Request,
    VarDay,
    VarShift,
    VarWorker,
)


# pylint: disable=R0801
class TestConstraint:
    @pytest.fixture
    def constraint_seq_hard(self) -> Constraint:
        return Constraint(
            id="constraint_seq_hard",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=4,
            target_unit="day",
            worker_var=VarWorker(selector="all", target=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal", target=["s0"], reference=[], relative=[]
            ),
            hard=True,
            hard_to_soft=False,
            penalty=0,
        )

    @pytest.fixture
    def constraint_seq_soft(self) -> Constraint:
        return Constraint(
            id="constraint_seq_soft",
            constraint_type="seq",
            operator="less_than_or_equal",
            target_value=2,
            target_unit="day",
            worker_var=VarWorker(selector="all", target=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal", target=["s0"], reference=[], relative=[]
            ),
            hard=False,
            hard_to_soft=False,
            penalty=20,
        )


class TestConstraintHard(TestEngine, TestConstraint):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # At most 4 shift off in a row
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts = [
            max_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_hard.shift_var.target
        ]

        assert max(counts) <= constraint_seq_hard.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # Exactly 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts_max = [
            max_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_hard.shift_var.target
        ]
        counts_min = [
            min_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_hard.shift_var.target
        ]

        assert all(
            count_min == constraint_seq_hard.target_value
            and count_max == constraint_seq_hard.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # At least 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "greater_than_or_equal"
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts = [
            min_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_hard.shift_var.target
        ]

        assert min(counts) >= constraint_seq_hard.target_value

    def test_less_than_or_equal_with_fixed_assignments(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-07"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-08"),
                shift_id="s1",
            ),
        ]

        inputs.fixed_assignments = fixed_assignments
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_greater_than_or_equal_with_fixed_assignments(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-07"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-08"),
                shift_id="s1",
            ),
        ]

        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "greater_than_or_equal"
        constraint_seq_hard.shift_var.target = ["s1"]
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_less_than_or_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # At most 4 shift off in a row, with request for 5
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
        ]
        inputs.requests = requests
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts = [
            max_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_hard.shift_var.target
        ]

        assert max(counts) <= constraint_seq_hard.target_value
        assert outputs.objective_value == 1

    def test_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # Exaclty 4 shift off in a row, with request for 3 and 5
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
        ]
        inputs.requests = requests
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts_min = [
            min_consecutive_shift_count(assignments, w, s)
            for w in ["w0", "w1"]
            for s in constraint_seq_hard.shift_var.target
        ]
        counts_max = [
            max_consecutive_shift_count(assignments, w, s)
            for w in ["w0", "w1"]
            for s in constraint_seq_hard.shift_var.target
        ]

        assert all(
            count_min == constraint_seq_hard.target_value
            and count_max == constraint_seq_hard.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )
        assert outputs.objective_value == 1

    def test_greater_than_or_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
    ) -> None:
        # At lest 4 shift off in a row, with request for 3
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                hard_to_soft=False,
                penalty=1,
            ),
        ]
        inputs.requests = requests
        constraint_seq_hard.operator = "greater_than_or_equal"
        inputs.constraints = [constraint_seq_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count = min_consecutive_shift_count(
            assignments, "w0", constraint_seq_hard.shift_var.target[0]
        )

        assert count <= constraint_seq_hard.target_value
        assert outputs.objective_value == 0


class TestConstraintSoft(TestEngine, TestConstraint):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_soft: Constraint,
    ) -> None:
        # At most 4 shift off in a row
        inputs.constraints = [constraint_seq_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts = [
            max_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_soft.shift_var.target
        ]

        assert max(counts) <= constraint_seq_soft.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_soft: Constraint,
    ) -> None:
        # Exactly 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_soft.operator = "equal"
        inputs.constraints = [constraint_seq_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts_max = [
            max_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_soft.shift_var.target
        ]
        counts_min = [
            min_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_soft.shift_var.target
        ]

        assert all(
            count_min == constraint_seq_soft.target_value
            and count_max == constraint_seq_soft.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_soft: Constraint,
    ) -> None:
        # At least 2 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_soft.operator = "greater_than_or_equal"
        inputs.constraints = [constraint_seq_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        counts = [
            min_consecutive_shift_count(assignments, w, s)
            for w in inputs.variable_space.workers
            for s in constraint_seq_soft.shift_var.target
        ]

        assert min(counts) >= constraint_seq_soft.target_value

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
        constraint_seq_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [
            constraint_seq_hard,
            constraint_seq_soft,
        ]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count_min = min_consecutive_shift_count(
            assignments,
            fixed_assignments[0].worker_id,
            constraint_seq_hard.shift_var.target[0],
        )
        count_max = max_consecutive_shift_count(
            assignments,
            fixed_assignments[0].worker_id,
            constraint_seq_hard.shift_var.target[0],
        )

        assert (
            count_min == constraint_seq_hard.target_value
            and count_max == constraint_seq_hard.target_value
        )

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
        constraint_seq_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [
            constraint_seq_hard,
            constraint_seq_soft,
        ]
        outputs = engine_solve(inputs)

        assert outputs.objective_value == constraint_seq_soft.penalty * (
            constraint_seq_hard.target_value - constraint_seq_soft.target_value
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
        constraint_seq_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [
            constraint_seq_hard,
            constraint_seq_soft,
        ]
        outputs = engine_solve(inputs)

        expected_variables = [
            (
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date,
                fixed_assignments[0].shift_id,
            ),
            (
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=1),
                fixed_assignments[0].shift_id,
            ),
            (
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=2),
                fixed_assignments[0].shift_id,
            ),
            (
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=3),
                fixed_assignments[0].shift_id,
            ),
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            cb_variable in expected_variables
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(exp_variable in cb.variables for cb in outputs.constraint_breaches)
            for exp_variable in expected_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_seq_hard: Constraint,
        constraint_seq_soft: Constraint,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        constraint_seq_hard.operator = "equal"
        inputs.constraints = [
            constraint_seq_hard,
            constraint_seq_soft,
        ]
        outputs = engine_solve(inputs)

        for cb in outputs.constraint_breaches:
            assert cb.value_diff == 1


def max_consecutive_shift_count(
    assignments: List[Assignment], worker_id: str, shift_id: str
) -> int:
    max_count = 0
    count = 0
    target_assignments = [a for a in assignments if a.worker_id == worker_id]
    sorted_assignments = sorted(target_assignments, key=lambda a: a.date)
    for a in sorted_assignments:
        if a.shift_id == shift_id:
            count += 1
            max_count = max(max_count, count)
        else:
            count = 0
    return max_count


def min_consecutive_shift_count(
    assignments: List[Assignment], worker_id: str, shift_id: str
) -> int:
    min_count = float("inf")
    count = 0
    target_assignments = [a for a in assignments if a.worker_id == worker_id]
    sorted_assignments = sorted(target_assignments, key=lambda a: a.date)
    for i, a in enumerate(sorted_assignments):
        if a.shift_id == shift_id:
            count += 1
            if i == len(sorted_assignments) - 1:
                min_count = min(min_count, count)
        else:
            if count != 0:
                min_count = min(min_count, count)
            count = 0
    return int(min_count) if min_count != float("inf") else 0
