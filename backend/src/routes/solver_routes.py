from flask import Blueprint
from solver import BuildVariable, BuildConstraint, BuildModel

solver_routes = Blueprint("solver_routes", __name__)


@solver_routes.route("/solver", methods=["GET"])
def solver():
    build_variable = BuildVariable()
    build_constraint = BuildConstraint()

    # build_variable.build_variable()
    variable_params = build_variable.get_variable_params_dict()
    (
        constraints_list,
        constraints_variables_list,
    ) = build_constraint.get_constraints_lists()
    build_model = BuildModel(
        variable_params, constraints_list, constraints_variables_list
    )
    build_model.build_variables()
    build_model.build_constraints()

    response = {"msg": "all good"}
    return response, 200
