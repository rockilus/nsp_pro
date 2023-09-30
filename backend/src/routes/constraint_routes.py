from fastapi import APIRouter, Body, HTTPException, status
from mongoengine import NotUniqueError

from constraint_transform import build_constraint, build_constraint_front
from scripts.setup_database import constraint_db, constraint_variable_db

router = APIRouter()


@router.post("/create-constraint", status_code=status.HTTP_201_CREATED)
async def create_constraint(info_received: dict = Body(...)):
    try:
        constraint, constraint_variables = build_constraint(
            info_received["constraint"], info_received["constraint_definition"]
        )
        constraint_created = constraint_db.create_constraint(**constraint)
        persisted_constraint_variables = [
            constraint_variable_db.create_constraint_variable(
                **constraint_variable, constraint=constraint_created
            )
            for constraint_variable in constraint_variables.values()
        ]
        constraint_dict = constraint_created.to_dict()
        constraint_variables_dict = [
            constraint_variable.to_dict()
            for constraint_variable in persisted_constraint_variables
        ]
        constraint_response = build_constraint_front(
            constraint_dict, constraint_variables_dict
        )
        return {"constraint": constraint_response}
    except NotUniqueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.get("/get-constraints")
async def get_constraints():
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
    return {"constraints": constraints_response}


@router.post("/update-constraint")
async def update_constraint(input_received: dict = Body(...)):
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
        return {"constraint": constraint_response}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.post("/update-constraint-status")
async def update_constraint_status(input_received: dict = Body(...)):
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
        return {"constraint": constraint_response}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e


@router.delete("/delete-constraint")
async def delete_constraint(input_received: dict = Body(...)):
    constraint_id = input_received["constraint_id"]
    try:
        constraint = constraint_db.get_constraint_by_id(constraint_id)
        constraint_variables = (
            constraint_variable_db.get_constraint_variables_by_constraint(constraint)
        )
        constraint_variable_db.delete_constraint_variables(constraint_variables)
        constraint_db.delete_constraint(constraint)
        return {"message": "constraint deleted"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
