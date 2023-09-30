from typing import Dict, List, Tuple, Union


# pylint: disable=too-many-branches
def build_constraint(
    constraint_inputs: Dict, constraint_definition: Dict
) -> Tuple[Dict, Dict]:
    constraint_keys = [
        "constraint_type",  # constraint
        "operator",  # constraint_definition
        "target_value",  # constraint_definition
        "hard_constraint",  # constraint
        "penalty",  # constraint
        "active",
    ]
    variables: Dict[str, List] = {
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

    constraint_variables: Dict[str, Dict[str, Union[str, int, bool]]] = {
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
        if key == "quantity":
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
                constraint_variables[var]["value"] = variables[var].index(value)
        elif key == "other_var_value" and value != "":
            var = constraint_definition["other_variable"]
            if var == "shift":
                constraint_variables[var]["other_value"] = variables[var].index(value)

    return constraint, constraint_variables
