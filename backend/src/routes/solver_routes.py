from flask import Blueprint
from engine import (
    Engine,
    Inputs,
    VariableSpace,
    Coverage,
    Custom,
    ShiftDemand,
)

solver_routes = Blueprint("solver_routes", __name__)


@solver_routes.route("/solver", methods=["GET"])
def solver():
    # pylint: disable=R0801
    engine = Engine()
    variable_space = VariableSpace(
        workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        start_date="2023-10-02",
        end_date="2023-10-15",
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(
        coverage=[
            ShiftDemand(
                date="2023-10-08",
                shift_id="s1",
                quantity=3,
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

    outputs = engine.solve(inputs)
    print(outputs)

    response = {"msg": "all good"}
    return response, 200
