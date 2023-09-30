import random

from engine.engine import Engine
from engine.inputs_outputs import Coverage, Custom, Inputs, ShiftDemand, VariableSpace


def test_engine_solve_return_expected_assigment_coverage():
    variable_space = VariableSpace(
        workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        start_date="2023-10-02",
        end_date="2023-10-15",
        shifts=["s0", "s1", "s2", "s3"],
    )
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
    requests = []
    fix_assignments = []
    custom = Custom(custom_constraints=[])

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.solution.solution

    count = sum(1 for a in assignments if a.date == "2023-10-02" and a.shift_id == "s0")

    assert count == target_coverage
