from datetime import date
from typing import Callable

from engine.tests.engine_test import TestEngine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import Assignment, Inputs, Outputs, Request


# pylint: disable=R0801
class TestRequestHard(TestEngine):
    def test_expected_assignment_for_hard_requests(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w1",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w2",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments
        target_assignments = [
            Assignment(r.worker_id, r.date, r.shift_id) for r in requests
        ]

        assert all(a in assignments for a in target_assignments)

    def test_no_solution_if_hard_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request0",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s3",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
            Request(
                id="request1",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s4",
                hard=True,
                hard_to_soft=False,
                penalty=0,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert not outputs.is_solution and len(outputs.assignments) == 0


# pylint: disable=R0801
class TestRequestSoft(TestEngine):
    def test_expected_assignment_for_request(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_assignments = [
            Assignment(
                worker_id=r.worker_id,
                date=r.date,
                shift_id=r.shift_id,
            )
            for r in requests
        ]

        assert all(a in assignments for a in target_assignments)

    def test_objective_if_requests_fullfilled(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                hard=False,
                hard_to_soft=False,
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                hard=False,
                hard_to_soft=False,
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_objective_if_requests_not_fullfilled(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s3",
                hard=True,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s3",
                hard=True,
                hard_to_soft=False,
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s3",
                hard=True,
                hard_to_soft=False,
                penalty=4,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == sum(r.penalty for r in requests if not r.hard)

    def test_expected_assignment_for_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=False,
                hard_to_soft=False,
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        target_assignment = Assignment(
            worker_id=requests[1].worker_id,
            date=requests[1].date,
            shift_id=requests[1].shift_id,
        )

        assert target_assignment in outputs.assignments

    def test_objective_for_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s3",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == requests[0].penalty

    def test_constraint_breaches_variables_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s3",
                hard=True,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s4",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        expected_variables = [
            (
                requests[1].worker_id,
                requests[1].date,
                requests[1].shift_id,
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

    def test_constraint_breaches_value_diff_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                hard=True,
                hard_to_soft=False,
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                hard=False,
                hard_to_soft=False,
                penalty=2,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        for cb in outputs.constraint_breaches:
            assert cb.value_diff == 1
