from fastapi import APIRouter

from engine import Coverage, Custom, Engine, Inputs, ShiftDemand, VariableSpace

router = APIRouter()


@router.get("/solver")
def solver():
    engine = Engine()
    variable_space = VariableSpace(
        workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6"],
        start_date="2024-10-02",
        end_date="2024-10-15",
        shifts=["s0", "s1", "s2", "s3"],
    )
    # pylint: disable=R0801
    coverage = Coverage(
        coverage=[
            ShiftDemand(
                date="2024-10-08",
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

    return {"msg": "all good"}
