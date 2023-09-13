from typing import Dict, List, Union

from bson import ObjectId
from flask import Blueprint, jsonify, request
from models import Constraint, ConstraintVariable
from mongoengine import NotUniqueError
from scripts.setup_database import constraint_db, constraint_variable_db

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
        constraint_variable_db.get_constraint_variables_by_constraint(
            constraint
        )
        for constraint in constraints
    ]
    constraints_dict = [constraint.to_dict() for constraint in constraints]
    constraints_variables_dict = [
        [
            constraint_variable.to_dict()
            for constraint_variable in constraint_variables
        ]
        for constraint_variables in constraints_variables
    ]
    constraints_response = []
    for constraint, constraint_variables in zip(
        constraints_dict, constraints_variables_dict
    ):
        constraint_front = build_constraint_front(
            constraint, constraint_variables
        )
        constraints_response.append(constraint_front)
    response = jsonify({"constraints": constraints_response})
    return response, 200


@constraint_routes.route("/update-constraint", methods=["POST"])
def update_constraint():
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
            constraint_variable_db.get_constraint_variables_by_constraint(
                constraint
            )
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
            constraint_variable_db.get_constraint_variables_by_constraint(
                constraint
            )
        )
        constraint_variable_db.delete_constraint_variables(
            constraint_variables
        )
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


def build_constraint(
    constraint_inputs: Dict, constraint_definition: Dict
) -> List[Union[Dict, List[Dict]]]:
    constraint_keys = [
        "constraint_type",  # constraint
        "operator",  # constraint_definition
        "target_value",  # constraint_definition
        "hard_constraint",  # constraint
        "penalty",  # constraint
        "active",
    ]
    variables = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    penalty = {
        "low": 3,
        "medium": 7,
        "high": 20,
    }

    constraint = {}
    for key in constraint_keys:
        if key in constraint_inputs:
            constraint[key] = constraint_inputs[key]
        elif key == "hard_constraint":
            constraint[key] = constraint_inputs["soft_or_hard"] == "hard"
        elif key == "penalty" and constraint_inputs["soft_priority"] != "":
            constraint[key] = penalty[constraint_inputs["soft_priority"]]

    constraint_variables = {
        "worker": {
            "param": "worker",
        },
        "day": {
            "param": "day",
        },
        "shift": {
            "param": "shift",
        },
    }
    for key, value in constraint_definition.items():
        if key in ["timing", "reference_variable", "other_variable"]:
            continue
        elif key == "quantity":
            constraint["target_value"] = value
        elif key == "operator" and value != "":
            constraint["operator"] = value
        elif (
            key == "quantified_variable"
            and constraint_inputs["constraint_type"] != "sum"
        ):
            constraint_variables[value]["intra"] = True
        elif key == "var_value" and value != "":
            var = constraint_definition["quantified_variable"]
            constraint_variables[var]["value"] = variables[var].index(value)
            if constraint_inputs["constraint_type"] == "order":
                constraint_variables[var]["operator"] = "pair"
            else:
                constraint_variables[var]["operator"] = "equal"
        elif key == "ref_var_value" and value != "":
            var = constraint_definition["reference_variable"]
            if var == "day":
                if constraint_inputs["constraint_type"] == "order":
                    constraint_variables[var]["operator"] = "offset"
                    constraint_variables[var]["interval"] = value
                elif value == "week":
                    constraint_variables[var]["operator"] = "interval"
                    constraint_variables[var]["value"] = 0
                    constraint_variables[var]["interval"] = 7
            elif var == "shift":
                constraint_variables[var]["operator"] = "equal"
                constraint_variables[var]["value"] = variables[var].index(
                    value
                )
        elif key == "other_var_value" and value != "":
            var = constraint_definition["other_variable"]
            if var == "shift":
                constraint_variables[var]["other_value"] = variables[
                    var
                ].index(value)

    return constraint, constraint_variables


def build_constraint_front(
    constraint: Dict, constraint_variables: List[Dict]
) -> Dict:
    penalty = {
        "low": 3,
        "medium": 7,
        "high": 20,
    }
    if constraint["constraint_type"] == "add":
        constraint_front = {
            "constraint": {
                "constraint_type": constraint["constraint_type"],
                "soft_or_hard": "hard"
                if constraint["hard_constraint"]
                else "soft",
                "soft_priority": next(
                    (
                        key
                        for key, val in penalty.items()
                        if val == constraint["penalty"]
                    ),
                    "",
                ),
            },
            "constraint_definition": {
                "quantity": constraint["target_value"],
                "quantified_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["intra"] is True
                    ),
                    "",
                ),
                "var_value": "",
                "timing": "per",
                "operator": "",
                "reference_variable": "day",
                "ref_var_value": "",
                "other_variable": "",
                "other_var_value": "",
            },
            "constraint_string": build_constraint_string(
                constraint, constraint_variables
            ),
            "_id": constraint["_id"],
            "active": constraint["active"],
        }
    if constraint["constraint_type"] == "sum":
        constraint_front = {
            "constraint": {
                "constraint_type": constraint["constraint_type"],
                "soft_or_hard": "hard"
                if constraint["hard_constraint"]
                else "soft",
                "soft_priority": next(
                    (
                        key
                        for key, val in penalty.items()
                        if val == constraint["penalty"]
                    ),
                    "",
                ),
            },
            "constraint_definition": {
                "quantity": constraint["target_value"],
                "quantified_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["operator"] == "equal"
                    ),
                    "",
                ),
                "var_value": get_var_value(constraint, constraint_variables),
                "timing": "per",
                "operator": constraint["operator"],
                "reference_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["operator"] == "interval"
                    ),
                    "",
                ),
                "ref_var_value": get_ref_var_value(
                    constraint, constraint_variables
                ),
                "other_variable": "",
                "other_var_value": "",
            },
            "constraint_string": build_constraint_string(
                constraint, constraint_variables
            ),
            "_id": constraint["_id"],
            "active": constraint["active"],
        }
    if constraint["constraint_type"] == "sequence":
        constraint_front = {
            "constraint": {
                "constraint_type": constraint["constraint_type"],
                "soft_or_hard": "hard"
                if constraint["hard_constraint"]
                else "soft",
                "soft_priority": next(
                    (
                        key
                        for key, val in penalty.items()
                        if val == constraint["penalty"]
                    ),
                    "",
                ),
            },
            "constraint_definition": {
                "quantity": constraint["target_value"],
                "quantified_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["intra"] is True
                    ),
                    "",
                ),
                "var_value": "",
                "timing": "consecutive",
                "operator": constraint["operator"],
                "reference_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["operator"] == "equal"
                    ),
                    "",
                ),
                "ref_var_value": get_ref_var_value(
                    constraint, constraint_variables
                ),
                "other_variable": "",
                "other_var_value": "",
            },
            "constraint_string": build_constraint_string(
                constraint, constraint_variables
            ),
            "_id": constraint["_id"],
            "active": constraint["active"],
        }
    if constraint["constraint_type"] == "order":
        constraint_front = {
            "constraint": {
                "constraint_type": constraint["constraint_type"],
                "soft_or_hard": "hard"
                if constraint["hard_constraint"]
                else "soft",
                "soft_priority": next(
                    (
                        key
                        for key, val in penalty.items()
                        if val == constraint["penalty"]
                    ),
                    "",
                ),
            },
            "constraint_definition": {
                "quantity": constraint["target_value"],
                "quantified_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["intra"] is True
                    ),
                    "",
                ),
                "var_value": get_var_value(constraint, constraint_variables),
                "timing": "after",
                "operator": constraint["operator"],
                "reference_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["operator"] == "offset"
                    ),
                    "",
                ),
                "ref_var_value": get_ref_var_value(
                    constraint, constraint_variables
                ),
                "other_variable": next(
                    (
                        d["param"]
                        for d in constraint_variables
                        if d["intra"] is True
                    ),
                    "",
                ),
                "other_var_value": get_other_var_value(constraint_variables),
            },
            "constraint_string": build_constraint_string(
                constraint, constraint_variables
            ),
            "_id": constraint["_id"],
            "active": constraint["active"],
        }
    return constraint_front


def build_constraint_string(
    constraint: Dict, constraint_variables: List[Dict]
) -> str:
    constraint_string_list = []
    if constraint["constraint_type"] == "add":
        constraint_string_list.append(
            str(constraint["constraint_type"]).capitalize()
        )
        constraint_string_list.append(str(constraint["target_value"]))
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["intra"] is True
                ),
                "",
            )
        )
        constraint_string_list.append("per")
        constraint_string_list.append("day")
    elif constraint["constraint_type"] == "sum":
        constraint_string_list.append(
            str(constraint["operator"]).capitalize().replace("_", " ")
        )
        constraint_string_list.append(str(constraint["target_value"]))
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["operator"] == "equal"
                ),
                "",
            )
        )
        constraint_string_list.append(
            get_var_value(constraint, constraint_variables)
        )
        constraint_string_list.append("per")
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["operator"] == "interval"
                ),
                "",
            )
        )
        constraint_string_list.append(
            get_ref_var_value(constraint, constraint_variables)
        )
    elif constraint["constraint_type"] == "sequence":
        constraint_string_list.append(
            str(constraint["operator"]).capitalize().replace("_", " ")
        )
        constraint_string_list.append(str(constraint["target_value"]))
        constraint_string_list.append("consecutive")
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["intra"] is True
                ),
                "",
            )
        )
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["operator"] == "equal"
                ),
                "",
            )
        )
        constraint_string_list.append(
            get_ref_var_value(constraint, constraint_variables)
        )
    elif constraint["constraint_type"] == "order":
        constraint_string_list.append(
            str(constraint["operator"]).capitalize().replace("_", " ")
        )
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["intra"] is True
                ),
                "",
            )
        )
        constraint_string_list.append(
            get_var_value(constraint, constraint_variables)
        )
        constraint_string_list.append("on")
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["operator"] == "offset"
                ),
                "",
            )
        )
        constraint_string_list.append(
            str(get_ref_var_value(constraint, constraint_variables))
        )
        constraint_string_list.append("after")
        constraint_string_list.append(
            next(
                (
                    d["param"]
                    for d in constraint_variables
                    if d["intra"] is True
                ),
                "",
            )
        )
        constraint_string_list.append(
            get_other_var_value(constraint_variables)
        )
    constraint_string = " ".join(constraint_string_list)
    return constraint_string


def get_var_value(constraint: Dict, constraint_variables: List[Dict]) -> str:
    variables = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    if constraint["constraint_type"] == "order":
        constraint_var = next(
            (d for d in constraint_variables if d["intra"] is True), {}
        )
        var_value = variables[constraint_var["param"]][constraint_var["value"]]
    else:
        constraint_var = next(
            (d for d in constraint_variables if d["operator"] == "equal"),
            {},
        )
        var_value = variables[constraint_var["param"]][constraint_var["value"]]
    return var_value


def get_ref_var_value(
    constraint: Dict, constraint_variables: List[Dict]
) -> str:
    ref_var_value = ""
    variables = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    if constraint["constraint_type"] == "sum":
        constraint_var = next(
            (d for d in constraint_variables if d["operator"] == "interval"),
            {},
        )
        ref_var_value = ""
        if constraint_var["value"] == 0 and constraint_var["interval"] == 7:
            ref_var_value = "week"
    elif constraint["constraint_type"] == "sequence":
        constraint_var = next(
            (d for d in constraint_variables if d["operator"] == "equal"),
            {},
        )
        ref_var_value = variables[constraint_var["param"]][
            constraint_var["value"]
        ]
    elif constraint["constraint_type"] == "order":
        constraint_var = next(
            (d for d in constraint_variables if d["operator"] == "offset"),
            {},
        )
        ref_var_value = constraint_var["interval"]

    return ref_var_value


def get_other_var_value(constraint_variables: List[Dict]) -> str:
    variables = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    constraint_var = next(
        (d for d in constraint_variables if d["intra"] is True),
        {},
    )
    other_var_value = variables[constraint_var["param"]][
        constraint_var["other_value"]
    ]
    return other_var_value
