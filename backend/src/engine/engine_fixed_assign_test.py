from datetime import date
from typing import Callable

from engine.engine_test import TestEngine
from engine.inputs_outputs import Assignment, Inputs, Outputs


# pylint: disable=R0801
class TestFixedAssignments(TestEngine):
    def test_expected_assignment_for_fixed_assignments(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
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
                shift_id="s2",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_no_solution_if_fixed_assignment_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.is_solution and len(outputs.assignments) == 0
