from datetime import date
from typing import Callable, List

import pytest

from engine.engine import Engine
from engine.inputs_outputs import (
    Assignment,
    Coverage,
    Custom,
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
        custom = Custom(constraints_sum=[], constraints_seq=[], constraints_ord=[])
        inputs = Inputs(
            variable_space=variable_space,
            coverage=coverage,
            requests=requests,
            fixed_assignments=fix_assignments,
            custom=custom,
        )
        return inputs

    @pytest.fixture
    def engine_solve(self, inputs: Inputs) -> Callable[[Inputs], Outputs]:
        engine = Engine()
        return lambda inputs=inputs: engine.solve(inputs)  # type: ignore
