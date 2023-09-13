from bson import ObjectId
from flask import Blueprint, jsonify, request
from mongoengine import NotUniqueError
from scripts.setup_database import constraint_db, constraint_variable_db

from constraint_transform import build_constraint, build_constraint_front

constraint_routes = Blueprint("constraint_routes", __name__)


@constraint_routes.route("/create-constraint", methods=["POST"])
def create_constraint():
    info_received = request.get_json()
    try:
        constraint, constraint_variables = build_constraint(
            info_received["constraint"], info_received["constraint_definition"]
        )
        constraint_created = constraint_db.create_constraint(**constraint)
        constraint_variables = [
            constraint_variable_db.create_constraint_variable(
                **constraint_variable, constraint=constraint_created
            )
            for constraint_variable in constraint_variables.values()
        ]
        constraint_dict = constraint_created.to_dict()
        constraint_variables_dict = [
            constraint_variable.to_dict()
            for constraint_variable in constraint_variables
        ]
        constraint_response = build_constraint_front(
            constraint_dict, constraint_variables_dict
        )
        response = jsonify({"constraint": constraint_response})
        return response, 200
    except NotUniqueError as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@constraint_routes.route("/get-constraints", methods=["GET"])
def get_constraints():
    constraints = constraint_db.get_constraints()
    constraints_variables = [
        constraint_variable_db.get_constraint_variables_by_constraint(constraint)
        for constraint in constraints
    ]
    constraints_dict = [constraint.to_dict() for constraint in constraints]
    constraints_variables_dict = [
        [constraint_variable.to_dict() for constraint_variable in constraint_variables]
        for constraint_variables in constraints_variables
    ]
    constraints_response = []
    for constraint, constraint_variables in zip(
        constraints_dict, constraints_variables_dict
    ):
        constraint_front = build_constraint_front(constraint, constraint_variables)
        constraints_response.append(constraint_front)
    response = jsonify({"constraints": constraints_response})
    return response, 200


@constraint_routes.route("/update-constraint", methods=["POST"])
def update_constraint():
    # pylint: disable=too-many-locals
    input_received = request.get_json()
    constraint_id = input_received["constraint_id"]
    constraint_input = input_received["constraint"]
    try:
        new_constraint, new_constraint_variables = build_constraint(
            constraint_input["constraint"],
            constraint_input["constraint_definition"],
        )
        constraint = constraint_db.get_constraint_by_id(constraint_id)
        constraint_variables = (
            constraint_variable_db.get_constraint_variables_by_constraint(constraint)
        )
        constraint_updated = constraint_db.update_constraint(
            constraint=constraint, **new_constraint
        )
        constraint_variables_updated = []
        for constraint_variable in constraint_variables:
            new_constraint_variable = new_constraint_variables[
                constraint_variable.param
            ]
            constraint_variables_updated.append(
                constraint_variable_db.update_constraint_variable(
                    constraint_variable=constraint_variable,
                    **new_constraint_variable,
                )
            )
        constraint_updated_dict = constraint_updated.to_dict()
        constraint_variables_updated_dict = [
            constraint_variable.to_dict()
            for constraint_variable in constraint_variables_updated
        ]
        constraint_response = build_constraint_front(
            constraint_updated_dict, constraint_variables_updated_dict
        )
        response = jsonify({"constraint": constraint_response})
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@constraint_routes.route("/update-constraint-status", methods=["POST"])
def update_constraint_status():
    input_received = request.get_json()
    constraint_id = input_received["constraint_id"]
    new_status = input_received["active"]
    try:
        constraint = constraint_db.get_constraint_by_id(constraint_id)
        constraint_updated = constraint_db.update_constraint_status(
            constraint, new_status
        )
        constraint_variables = (
            constraint_variable_db.get_constraint_variables_by_constraint(
                constraint_updated
            )
        )
        constraint_updated_dict = constraint_updated.to_dict()
        constraint_variables_dict = [
            constraint_variable.to_dict()
            for constraint_variable in constraint_variables
        ]
        constraint_response = build_constraint_front(
            constraint_updated_dict, constraint_variables_dict
        )
        response = jsonify({"constraint": constraint_response})
        return response, 200
    # pylint: disable=broad-except
    except Exception as e:  # noqa: E722
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


@constraint_routes.route("/delete-constraint", methods=["DELETE"])
def delete_constraint():
    input_received = request.get_json()
    constraint_id = input_received["constraint_id"]
    try:
        constraint = constraint_db.get_constraint_by_id(constraint_id)
        constraint_variables = (
            constraint_variable_db.get_constraint_variables_by_constraint(constraint)
        )
        constraint_variable_db.delete_constraint_variables(constraint_variables)
        constraint_db.delete_constraint(constraint)
        return jsonify({"message": "constraint deleted"}), 200
    # pylint: disable=broad-except,R0801
    except Exception as e:
        print(e)
        return jsonify({"error": f"{str(e)}"}), 404


def is_valid_objectid(objectid_str: str) -> bool:
    # pylint: disable=R0801
    try:
        ObjectId(objectid_str)
        return True
    # pylint: disable=broad-except
    # pylint: disable=bare-except
    except:  # noqa: E722
        return False
