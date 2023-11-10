from datetime import date
from typing import Callable, List

import pytest

from engine.engine import Engine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Assignment,
    Constraint,
    Coverage,
    Inputs,
    Outputs,
    Request,
    VariableSpace,
)


class TestEngine:
    @pytest.fixture
    def inputs(self) -> Inputs:
        variable_space = VariableSpace(
            workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
            start_date=date.fromisoformat("2023-10-02"),
            end_date=date.fromisoformat("2023-10-15"),
            shifts=["s0", "s1", "s2", "s3"],
        )
        coverage = Coverage([])
        requests: List[Request] = []
        fix_assignments: List[Assignment] = []
        constraints: List[Constraint] = []
        inputs = Inputs(
            variable_space=variable_space,
            coverage=coverage,
            requests=requests,
            fixed_assignments=fix_assignments,
            constraints=constraints,
        )
        return inputs

    @pytest.fixture
    def engine_solve(self, inputs: Inputs) -> Callable[[Inputs], Outputs]:
        engine = Engine()
        return lambda inputs=inputs: engine.solve(inputs)  # type: ignore
