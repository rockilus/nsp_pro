from solver import BuildVariable


def run_solver() -> None:
    build_variable = BuildVariable()
    build_variable.build_variable()
    # build_model = BuildModel(var_params, [])
    # build_model.build_variables()
    # build_model.build_constraints()
    # build_model.add_objective()
    # solver = ModelSolver(build_model)
    # solver.solve()
    # solver.print_solution()
