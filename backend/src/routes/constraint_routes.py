from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter

from core.constraint import Block, ConstraintBuild, MissingProperty
from routes.api_model import (
    BlockMessage,
    ConstraintBuildMessage,
    MissingPropertyMessage,
)
from scripts.setup_database import constraint_build_db
from services.authentication.authn_services import authn_verify_session
from services.authentication.authn_types import SessionContainerType
from services.authorization.authz_services import permit_check
from services.constraint_build_services.blocks_to_string import blocks_to_string
from services.deletion_services.delete_constraint_build import (
    delete_constraint_build as delete_constraint_build_service,
)

router = APIRouter()


@router.post("/constraints/teams/{team_id}", status_code=201)
async def create_constraint(
    team_id: str,
    req: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ConstraintBuildMessage:
    if not await permit_check(
        session.get_user_id(), "create-constraint", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create a constraint",
        )
    cb_data = api_msg_to_constraint_build(req)
    cb_data.text = blocks_to_string(cb_data.blocks)
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    return constraint_build_to_api_msg(constraint_build)


@router.get("/constraints/teams/{team_id}")
async def get_constraints(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ConstraintBuildMessage]:
    if not await permit_check(
        session.get_user_id(), "read-constraints", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to get constraints",
        )
    constraint_builds = constraint_build_db.get_constraint_builds()
    return [constraint_build_to_api_msg(cb) for cb in constraint_builds]


@router.put("/constraints/{constraint_build_id}/teams/{team_id}")
async def update_constraint(
    constraint_build_id: str,
    team_id: str,
    updated_constraint_build: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ConstraintBuildMessage:
    if not await permit_check(
        session.get_user_id(), "update-constraint", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update a constraint",
        )
    cb_data = api_msg_to_constraint_build(updated_constraint_build)
    existing_cb = constraint_build_db.get_constraint_build_by_id(constraint_build_id)
    if not existing_cb:
        raise HTTPException(status_code=404, detail="Constraint does not exist")
    cb_data.text = blocks_to_string(cb_data.blocks)
    cb_updated = constraint_build_db.update_constraint_build(cb_data)
    return constraint_build_to_api_msg(cb_updated)


@router.delete("/constraints/{constraint_build_id}/teams/{team_id}")
async def delete_constraint(
    constraint_build_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    if not await permit_check(
        session.get_user_id(), "delete-constraint", "team", team_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete a constraint",
        )
    delete_constraint_build_service(constraint_build_id)
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
        missing_property_to_api_msg(mp) for mp in constraint_build.missing_properties
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
