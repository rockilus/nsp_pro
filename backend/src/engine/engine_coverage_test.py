import random
from datetime import date
from typing import Callable

from engine.engine_test import TestEngine
from engine.inputs_outputs import Coverage, Inputs, Outputs, ShiftDemand


# pylint: disable=R0801
class TestCoverage(TestEngine):
    def test_expected_assigment_coverage(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        target_coverage = random.randint(1, 8)
        coverage = Coverage(
            coverage=[
                ShiftDemand(
                    date="2023-10-02",
                    shift_id="s0",
                    quantity=target_coverage,
                ),
            ]
        )
        inputs.coverage = coverage
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count = sum(
            1
            for a in assignments
            if a.date == date.fromisoformat("2023-10-02") and a.shift_id == "s0"
        )

        assert count == target_coverage
