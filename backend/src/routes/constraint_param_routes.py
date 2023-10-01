from fastapi import APIRouter

from scripts.setup_database import constraint_param_db, constraint_param_option_db

router = APIRouter()


@router.get("/constraint-params")
def get_constraint_params():
    constraint_param = constraint_param_db.get_constraint_params()

    if not constraint_param:
        constraint_param = constraint_param_db.create_default_constraint_params()

    constraint_param_options = constraint_param_option_db.get_constraint_param_options(
        constraint_param
    )

    if not constraint_param_options:
        constraint_param_options = (
            constraint_param_option_db.create_default_constraint_param_options(
                constraint_param
            )
        )

    constraint_param_dict = constraint_param.to_dict()
    constraint_param_options_dict = [
        constraint_param_option.to_dict()
        for constraint_param_option in constraint_param_options
    ]

    constraint_param_response = {
        "constraint_param": constraint_param_dict,
        "constraint_param_options": constraint_param_options_dict,
    }

    print("constraint_params_dict:", constraint_param_response)

    return {"constraint_param": constraint_param_response}
