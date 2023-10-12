from datetime import date, timedelta
from typing import Callable

import pytest

from engine.engine_test import TestEngine
from engine.inputs_outputs import (
    Assignment,
    ConstraintOrd,
    Custom,
    Inputs,
    Outputs,
    Request,
    VarOrdDay,
    VarOrdShift,
    VarOrdWorker,
)


# pylint: disable=R0801
class TestConstraintOrd:
    @pytest.fixture
    def custom_hard(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_hard",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    day_var=VarOrdDay(selector="all", interval=1, target=0),
                    shift_var=VarOrdShift(reference="s1", relative="s0"),
                    hard=True,
                    penalty=0,
                )
            ],
        )

    @pytest.fixture
    def custom_soft(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_soft",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    day_var=VarOrdDay(selector="all", interval=1, target=0),
                    shift_var=VarOrdShift(reference="s1", relative="s0"),
                    hard=False,
                    penalty=20,
                )
            ],
        )

    @pytest.fixture
    def custom_hard_soft_conflict(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_hard",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    day_var=VarOrdDay(selector="all", interval=1, target=0),
                    shift_var=VarOrdShift(reference="s1", relative="s0"),
                    hard=True,
                    penalty=0,
                ),
                ConstraintOrd(
                    id="constraint_seq_soft",
                    operator="yes",
                    worker_var=VarOrdWorker(selector="all"),
                    day_var=VarOrdDay(selector="all", interval=1, target=0),
                    shift_var=VarOrdShift(reference="s1", relative="s0"),
                    hard=False,
                    penalty=20,
                ),
            ],
        )


class TestConstraintOrdHard(TestEngine, TestConstraintOrd):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            != custom_hard.constraints_ord[0].shift_var.relative
        )

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].shift_var.relative = "s3"
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            == custom_hard.constraints_ord[0].shift_var.relative
        )

    def test_no_solution_for_no_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
            ),
        ]
        inputs.custom = custom_hard
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.solution_exist and len(outputs.assignments) == 0

    def test_no_solution_for_yes_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
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
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.solution_exist and len(outputs.assignments) == 0

    def test_expected_assignment_for_no_interval_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].day_var.interval = 3
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            != custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_interval_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].day_var.interval = 3
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            == custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_interval_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].day_var.interval = -3
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            != custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_interval_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].day_var.interval = -3
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            == custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_week_day_index_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days after shift s1 on week day index 0
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
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].day_var.selector = "week_day_index"
        inputs.custom.constraints_ord[0].day_var.interval = 3
        inputs.custom.constraints_ord[0].day_var.target = 0
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord.day_var.target
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            != custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_week_day_index_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Shift s0 three days after shift s1 on week day index 0
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
                date=date.fromisoformat("2023-10-06"),
                shift_id="s2",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].day_var.selector = "week_day_index"
        inputs.custom.constraints_ord[0].day_var.interval = 3
        inputs.custom.constraints_ord[0].day_var.target = 0
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord.day_var.target
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            == custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_week_day_index_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 three days before shift s1 on week day index 0
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-13"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].day_var.selector = "week_day_index"
        inputs.custom.constraints_ord[0].day_var.interval = -3
        inputs.custom.constraints_ord[0].day_var.target = 0
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord.day_var.target
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            != custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_week_day_index_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Shift s0 three days before shift s1 on week day index 0
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s2",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-13"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].day_var.selector = "week_day_index"
        inputs.custom.constraints_ord[0].day_var.interval = 3
        inputs.custom.constraints_ord[0].day_var.target = 0
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = custom_hard.constraints_ord[0]

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord.day_var.target
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            >= inputs.variable_space.start_date
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            <= inputs.variable_space.end_date
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id
            == custom_hard.constraints_ord[0].shift_var.relative
            for next_assignment in next_assignments
        )


class TestConstraintOrdSoft(TestEngine, TestConstraintOrd):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.custom = custom_soft
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            != custom_soft.constraints_ord[0].shift_var.relative
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # Shift s3 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.custom = custom_soft
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].shift_var.relative = "s3"
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            == custom_soft.constraints_ord[0].shift_var.relative
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            != custom_hard_soft_conflict.constraints_ord[0].shift_var.relative
        )

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert (
            outputs.objective_value
            == custom_hard_soft_conflict.constraints_ord[1].penalty
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        constraint_ord_soft = custom_hard_soft_conflict.constraints_ord[1]

        expected_variables = [
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date,
                constraint_ord_soft.shift_var.reference,
            ],
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=1),
                constraint_ord_soft.shift_var.relative,
            ],
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
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        constraint_ord_soft = custom_hard_soft_conflict.constraints_ord[1]

        assert outputs.objective_value == constraint_ord_soft.penalty
