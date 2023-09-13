from solver import BuildModel, ModelSolver

var_params = {
    "num_workers": {
        "index": 0,
        "value": 8,
    },
    "num_days": {
        "index": 1,
        "value": 14,
    },
    "num_shifts": {
        "index": 2,
        "value": 4,
    },
}


def run_solver() -> None:
    build_model = BuildModel(var_params, [])
    build_model.build_variables()
    build_model.build_constraints()
    build_model.add_objective()
    solver = ModelSolver(build_model)
    solver.solve()
    solver.print_solution()
