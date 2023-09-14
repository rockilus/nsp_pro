from typing import Dict, List

from constraint_transform.constraint_utils import (
    get_other_var_value,
    get_ref_var_value,
    get_var_value,
)


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
