from typing import Dict, List


def get_var_value(constraint: Dict, constraint_variables: List[Dict]) -> str:
    variables: Dict[str, List] = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    if constraint["constraint_type"] == "order":
        constraint_var: Dict = next(
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


def get_ref_var_value(constraint: Dict, constraint_variables: List[Dict]) -> str:
    ref_var_value = ""
    variables: Dict[str, List] = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    if constraint["constraint_type"] == "sum":
        constraint_var: Dict = next(
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
        ref_var_value = variables[constraint_var["param"]][constraint_var["value"]]
    elif constraint["constraint_type"] == "order":
        constraint_var = next(
            (d for d in constraint_variables if d["operator"] == "offset"),
            {},
        )
        ref_var_value = constraint_var["interval"]

    return ref_var_value


def get_other_var_value(constraint_variables: List[Dict]) -> str:
    variables: Dict[str, List] = {
        "worker": [],
        "day": [],
        "shift": ["off", "morning", "afternoon", "night"],
    }
    constraint_var: Dict = next(
        (d for d in constraint_variables if d["intra"] is True),
        {},
    )
    other_var_value = variables[constraint_var["param"]][constraint_var["other_value"]]
    return other_var_value
