from dataclasses import asdict
from typing import List

import humps
from core.constraint import Constraint, ConstraintBuild
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter
from routes.api_model import ConstraintMessage, NewConstraintMessage
from scripts.setup_database import constraint_db
from constraint_parser import constraint_parse
from services import update_constraint_same_text

router = APIRouter()


@router.post("/constraints", status_code=201)
def create_constraint(req: ConstraintMessage) -> ConstraintMessage:
    c_data = api_msg_to_constraint_build(req)
    constraint = constraint_parse(c_data)
    constraint = constraint_db.create_constraint(constraint)
    response = constraint_to_api_msg(constraint)
    return response


@router.get("/constraints")
def get_constraints() -> List[ConstraintMessage]:
    constraints = constraint_db.get_constraints()
    return [constraint_to_api_msg(c) for c in constraints]


@router.put("/constraints/{constraint_id}")
def update_constraint(
    constraint_id: str, updated_constraint: ConstraintMessage
) -> ConstraintMessage:
    cb_data = api_msg_to_constraint_build(updated_constraint)
    existing_c = constraint_db.get_constraint_by_id(constraint_id)
    if not existing_c:
        raise HTTPException(
            status_code=404, detail="Constraint does not exist"
        )
    if cb_data.text != existing_c.text:
        c_updated = constraint_parse(cb_data)
    else:
        c_updated = update_constraint_same_text(cb_data, existing_c)
    constraint = constraint_db.update_constraint(c_updated)
    return constraint_to_api_msg(constraint)


@router.delete("/constraints/{constraint_id}")
def delete_constraint(constraint_id: str):
    constraint_db.delete_constraint(constraint_id)
    return {"message": "Constraint deleted"}


def constraint_to_api_msg(
    constraint: Constraint,
) -> ConstraintMessage:
    constraint_build = ConstraintBuild(
        id=constraint.id,
        text=constraint.text,
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
    return ConstraintBuild(**data_snake)


def api_msg_to_new_constraint(msg: NewConstraintMessage) -> str:
    return msg.text
