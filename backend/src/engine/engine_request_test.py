from datetime import date
from typing import Callable

from engine.engine_test import TestEngine
from engine.inputs_outputs import Assignment, Inputs, Outputs, Request


# pylint: disable=R0801
class TestRequest(TestEngine):
    def test_expected_assignment_for_request(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
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
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_objective_if_requests_not_fullfilled(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
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
                shift_id="s2",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s3",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                penalty=4,
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == sum(r.penalty for r in requests)

    def test_expected_assignment_for_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
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
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == requests[0].penalty

    def test_constraint_breaches_variables_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
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
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
        ]
        inputs.requests = requests
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        expected_variables = [
            [
                requests[0].worker_id,
                requests[0].date,
                requests[0].shift_id,
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

    def test_constraint_breaches_value_diff_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
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
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
        ]
        inputs.requests = requests
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        for cb in outputs.constraint_breaches:
            assert cb.value_diff == 1
