from dataclasses import asdict

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.constraint import BuildBlock, Constraint, ConstraintBuild
from routes.api_model import ConstraintMessage
from scripts.setup_database import constraint_db
from services import build_constraint

router = APIRouter()


@router.post("/constraints", status_code=201)
def create_constraint(req: ConstraintMessage) -> ConstraintMessage:
    cb_data = api_msg_to_constraint_build(req)
    constraint = build_constraint(cb_data)
    constraint = constraint_db.create_constraint(constraint)
    response = constraint_to_api_msg(constraint)
    return response


@router.get("/constraints")
def get_constraints():
    constraints = constraint_db.get_constraints()
    return [constraint_to_api_msg(c) for c in constraints]


@router.put("/constraints/{constraint_id}")
def update_constraint(
    constraint_id: str, updated_constraint: ConstraintMessage
) -> ConstraintMessage:
    cb_data = api_msg_to_constraint_build(updated_constraint)

    existing_c = constraint_db.get_constraint_by_id(constraint_id)
    if not existing_c:
        raise HTTPException(status_code=404, detail="Constraint does not exist")

    constraint = build_constraint(cb_data)
    constraint = constraint_db.update_constraint(constraint)

    response = constraint_to_api_msg(constraint)
    return response


@router.delete("/constraints/{constraint_id}")
def delete_constraint(constraint_id: str):
    constraint_db.delete_constraint(constraint_id)
    return {"message": "Constraint deleted"}


def constraint_to_api_msg(
    constraint: Constraint,
) -> ConstraintMessage:
    constraint_build = ConstraintBuild(
        id=constraint.id,
        build_blocks=constraint.build_blocks,
        hard=constraint.hard,
        priority=constraint.priority,
        active=constraint.active,
    )
    data = asdict(constraint_build)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintMessage)
    return validator.validate_python(as_dict)


def api_msg_to_constraint_build(
    msg: ConstraintMessage,
) -> ConstraintBuild:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["build_blocks"] = [
        BuildBlock(**humps.decamelize(d)) for d in data_snake["build_blocks"]
    ]
    return ConstraintBuild(**data_snake)
