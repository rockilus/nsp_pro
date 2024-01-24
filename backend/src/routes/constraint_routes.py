from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from constraint_parser import constraint_parse
from core.constraint import Block, Constraint, ConstraintBuild
from routes.api_model import BlockMessage, ConstraintMessage
from scripts.setup_database import constraint_db
from services import update_constraint_same_text

router = APIRouter()


@router.post("/constraints", status_code=201)
def create_constraint(req: ConstraintMessage) -> ConstraintMessage:
    c_data = api_msg_to_constraint_build(req)
    constraint = constraint_parse(c_data)
    constraint = constraint_db.create_constraint(constraint)
    return constraint_to_api_msg(constraint)


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


def block_to_api_msg(block: Block) -> BlockMessage:
    data = asdict(block)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BlockMessage)
    return validator.validate_python(as_dict)


def constraint_to_api_msg(
    constraint: Constraint,
) -> ConstraintMessage:
    constraint_build = ConstraintBuild(
        id=constraint.id,
        constraint_type=constraint.constraint_type,
        template_id=constraint.template_id,
        blocks=constraint.blocks,
        text=constraint.text,
        hard=constraint.hard,
        priority=constraint.priority,
        active=constraint.active,
    )
    blocks = [block_to_api_msg(b) for b in constraint.blocks]
    data = asdict(constraint_build)
    data["blocks"] = blocks
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintMessage)
    return validator.validate_python(as_dict)


def api_msg_to_block(msg: BlockMessage) -> Block:
    data_snake = humps.decamelize(msg.model_dump())
    return Block(**data_snake)


def api_msg_to_constraint_build(
    msg: ConstraintMessage,
) -> ConstraintBuild:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["blocks"] = [api_msg_to_block(b) for b in msg.blocks]
    return ConstraintBuild(**data_snake)
