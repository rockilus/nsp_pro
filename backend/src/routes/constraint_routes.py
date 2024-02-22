from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, HTTPException
from pydantic import TypeAdapter

from core.constraint import Block, ConstraintBuild, MissingProperty
from routes.api_model import (
    BlockMessage,
    ConstraintBuildMessage,
    MissingPropertyMessage,
)
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.blocks_to_string import (
    blocks_to_string,
)

router = APIRouter()


@router.post("/constraints", status_code=201)
def create_constraint(req: ConstraintBuildMessage) -> ConstraintBuildMessage:
    cb_data = api_msg_to_constraint_build(req)
    cb_data.text = blocks_to_string(cb_data.blocks)
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    return constraint_build_to_api_msg(constraint_build)


@router.get("/constraints")
def get_constraints() -> List[ConstraintBuildMessage]:
    constraint_builds = constraint_build_db.get_constraint_builds()
    return [constraint_build_to_api_msg(cb) for cb in constraint_builds]


@router.put("/constraints/{constraint_build_id}")
def update_constraint(
    constraint_build_id: str, updated_constraint_build: ConstraintBuildMessage
) -> ConstraintBuildMessage:
    cb_data = api_msg_to_constraint_build(updated_constraint_build)
    existing_cb = constraint_build_db.get_constraint_build_by_id(
        constraint_build_id
    )
    if not existing_cb:
        raise HTTPException(
            status_code=404, detail="Constraint does not exist"
        )
    cb_data.text = blocks_to_string(cb_data.blocks)
    cb_updated = constraint_build_db.update_constraint_build(cb_data)
    return constraint_build_to_api_msg(cb_updated)


@router.delete("/constraints/{constraint_build_id}")
def delete_constraint(constraint_build_id: str):
    constraint_build_db.delete_constraint_build(constraint_build_id)
    return {"message": "Constraint deleted"}


def block_to_api_msg(block: Block) -> BlockMessage:
    data = asdict(block)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BlockMessage)
    return validator.validate_python(as_dict)


def missing_property_to_api_msg(
    missing_property: MissingProperty,
) -> MissingPropertyMessage:
    data = asdict(missing_property)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(MissingPropertyMessage)
    return validator.validate_python(as_dict)


def constraint_build_to_api_msg(
    constraint_build: ConstraintBuild,
) -> ConstraintBuildMessage:
    blocks = [block_to_api_msg(b) for b in constraint_build.blocks]
    missing_properties = [
        missing_property_to_api_msg(mp)
        for mp in constraint_build.missing_properties
    ]
    data = asdict(constraint_build)
    data["blocks"] = blocks
    data["missing_properties"] = missing_properties
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintBuildMessage)
    return validator.validate_python(as_dict)


def api_msg_to_block(msg: BlockMessage) -> Block:
    data_snake = humps.decamelize(msg.model_dump())
    return Block(**data_snake)


def api_msg_to_constraint_build(
    msg: ConstraintBuildMessage,
) -> ConstraintBuild:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["blocks"] = [api_msg_to_block(b) for b in msg.blocks]
    return ConstraintBuild(**data_snake)


# def blocks_to_string(blocks: List[Block]) -> str:
#     values = []
#     for block in blocks:
#         if isinstance(block.value, list):
#             block_values = block.value
#             if all(isinstance(v, dict) for v in block.value):
#                 block_values = [v["name"] for v in block_values]  # type: ignore
#             if len(block_values) > 1 and all(isinstance(v, str) for v in block_values):
#                 values.append(
#                     ', '.join(block_values[:-1])  # type: ignore
#                     + ' and '
#                     + block_values[-1]
#                 )
#             elif isinstance(block_values[0], str):
#                 values.append(block_values[0])
#         else:
#             values.append(str(block.value))
#     joined_values = ' '.join(values)
#     capitalized_values = joined_values.capitalize()
#     return capitalized_values + '.'
