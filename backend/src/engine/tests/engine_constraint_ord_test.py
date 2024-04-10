from datetime import date, datetime, timedelta
from typing import Callable

import pytest

from engine.tests.engine_test import TestEngine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Constraint,
    Inputs,
    Outputs,
    Request,
    VarDay,
    VarShift,
    VarWorker,
)
from utils.constants import Constants


# pylint: disable=R0801
class TestConstraint:
    @pytest.fixture
    def constraint_ord_hard(self) -> Constraint:
        return Constraint(
            id="constraint_ord_hard",
            constraint_type="ord",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(selector="all", target=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=1,
            ),
            shift_var=VarShift(
                selector="all", target=[], reference=["s1"], relative=["s0"]
            ),
            hard=True,
            hard_to_soft=False,
            penalty=0,
        )

    @pytest.fixture
    def constraint_ord_soft(self) -> Constraint:
        return Constraint(
            id="constraint_ord_soft",
            constraint_type="ord",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(selector="all", target=[], num_eligible_workers=0),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=1,
            ),
            shift_var=VarShift(
                selector="all", target=[], reference=["s1"], relative=["s0"]
            ),
            hard=False,
            hard_to_soft=False,
            penalty=20,
        )


class TestConstraintHard(TestEngine, TestConstraint):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id
            and a.date == requests[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # Shift s3 after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.shift_var.relative = ["s3"]
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id
            and a.date == requests[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id == constraint_ord_hard.shift_var.relative[0]

    def test_no_solution_for_no_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert not outputs.is_solution and len(outputs.assignments) == 0

    def test_no_solution_for_yes_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # Shift s3 after shift s1, while fixed assignment s4 after s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s4",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.constraints = [constraint_ord_hard]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.shift_var.relative = ["s3"]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert not outputs.is_solution and len(outputs.assignments) == 0

    def test_expected_assignment_for_no_interval_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.day_var.interval = 3
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_interval_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.day_var.interval = 3
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id == constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_interval_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.day_var.interval = -3
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_interval_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days after shift s1
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.day_var.interval = -3
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id == constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_week_day_index_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days after shift s1 on week day index 0
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.constraints = [constraint_ord_hard]
        constraint_ord_hard.day_var.selector = "week_day_index"
        constraint_ord_hard.day_var.interval = 3
        constraint_ord_hard.day_var.target = 0
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_ord = constraint_ord_hard

        dates = [
            a.date + timedelta(days=constraint_ord.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord.day_var.target
            and a.date + timedelta(days=constraint_ord.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_week_day_index_plus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # Shift s0 three days after shift s1 on week day index 0
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s2",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.day_var.selector = "week_day_index"
        constraint_ord_hard.day_var.interval = 3
        inputs.constraints = [constraint_ord_hard]
        constraint_ord_hard.day_var.target = 0
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord_hard.day_var.target
            and a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id == constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_no_week_day_index_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # No shift s0 three days before shift s1 on week day index 0
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-13"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.day_var.selector = "week_day_index"
        constraint_ord_hard.day_var.interval = -3
        constraint_ord_hard.day_var.target = 0
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord_hard.day_var.target
            and a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )

    def test_expected_assignment_for_yes_week_day_index_minus_three(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
    ) -> None:
        # Shift s0 three days before shift s1 on week day index 0
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s2",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-13"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-09"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-15"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_hard.operator = "yes"
        constraint_ord_hard.day_var.selector = "week_day_index"
        constraint_ord_hard.day_var.interval = 3
        constraint_ord_hard.day_var.target = 0
        inputs.constraints = [constraint_ord_hard]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates = [
            a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            for a in assignments
            if a.date.weekday() == constraint_ord_hard.day_var.target
            and a.date + timedelta(days=constraint_ord_hard.day_var.interval)
            in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.days
            ]
        ]

        next_assignments = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id and a.date in dates
        ]
        assert (
            next_assignment.shift_id == constraint_ord_hard.shift_var.relative[0]
            for next_assignment in next_assignments
        )


class TestConstraintSoft(TestEngine, TestConstraint):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_soft: Constraint,
    ) -> None:
        # No shift s0 after shift s1
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                hard=False,
                hard_to_soft=False,
                penalty=1,
            ),
        ]
        inputs.constraints = [constraint_ord_soft]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id
            and a.date == requests[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id != constraint_ord_soft.shift_var.relative[0]
        assert outputs.objective_value == 1

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_soft: Constraint,
    ) -> None:
        # Shift s3 after shift s1
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=1,
            ),
        ]
        constraint_ord_soft.operator = "yes"
        constraint_ord_soft.shift_var.relative = ["s3"]
        inputs.constraints = [constraint_ord_soft]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id
            and a.date == requests[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id == constraint_ord_soft.shift_var.relative[0]
        assert outputs.objective_value == 1

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
        constraint_ord_soft: Constraint,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_soft.operator = "yes"
        inputs.constraints = [
            constraint_ord_hard,
            constraint_ord_soft,
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == requests[0].worker_id
            and a.date == requests[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id != constraint_ord_hard.shift_var.relative[0]

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
        constraint_ord_soft: Constraint,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_soft.operator = "yes"
        inputs.constraints = [
            constraint_ord_hard,
            constraint_ord_soft,
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == constraint_ord_soft.penalty

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_ord_hard: Constraint,
        constraint_ord_soft: Constraint,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_soft.operator = "yes"
        inputs.constraints = [
            constraint_ord_hard,
            constraint_ord_soft,
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        expected_variables = [
            (
                requests[0].worker_id,
                requests[0].date,
                constraint_ord_soft.shift_var.reference[0],
            ),
            (
                requests[0].worker_id,
                requests[0].date + timedelta(days=1),
                constraint_ord_soft.shift_var.relative[0],
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
        constraint_ord_hard: Constraint,
        constraint_ord_soft: Constraint,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        constraint_ord_soft.operator = "yes"
        inputs.constraints = [
            constraint_ord_hard,
            constraint_ord_soft,
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == constraint_ord_soft.penalty
