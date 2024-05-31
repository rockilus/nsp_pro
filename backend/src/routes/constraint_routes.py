from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import Block, ConstraintBuild, MissingProperty
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_create_core_object_error,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import SessionContainerType, authn_verify_session
from integrations.authorization import authz_check
from logger import log_info
from routes.api_model import (
    BlockMessage,
    ConstraintBuildMessage,
    MissingPropertyMessage,
)
from scripts.setup_database import constraint_build_db
from services.constraint_build_services import (
    blocks_to_string,
    delete_constraint_build_and_dependencies,
)

router = APIRouter()


@router.post("/constraints/teams/{team_id}", status_code=201)
async def create_constraint(
    team_id: str,
    req: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ConstraintBuildMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a constraint"
            )
        cb_data = msg_to_core_constraint_build(req)
        cb_data.text = blocks_to_string(cb_data.blocks, cb_data.language)
        constraint_build = constraint_build_db.create_constraint_build(cb_data)
        response = core_to_msg_constraint_build(constraint_build)
    except Exception as e:
        log_info("Failed to create constraint")
        handle_routes_errors(e)
    return response


@router.get("/constraints/teams/{team_id}")
async def get_constraints(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[ConstraintBuildMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-constraints", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get constraints")
        constraint_builds = constraint_build_db.get_constraint_builds(team_id)
        response = [core_to_msg_constraint_build(cb) for cb in constraint_builds]
    except Exception as e:
        log_info("Failed to get constraints")
        handle_routes_errors(e)
    return response


@router.put("/constraints/{constraint_build_id}/teams/{team_id}")
async def update_constraint(
    team_id: str,
    updated_constraint_build: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> ConstraintBuildMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a constraint"
            )
        cb_data = msg_to_core_constraint_build(updated_constraint_build)
        cb_data.text = blocks_to_string(cb_data.blocks, cb_data.language)
        cb_updated = constraint_build_db.update_constraint_build(cb_data)
        response = core_to_msg_constraint_build(cb_updated)
    except Exception as e:
        log_info("Failed to update constraint")
        handle_routes_errors(e)
    return response


@router.delete("/constraints/{constraint_build_id}/teams/{team_id}")
async def delete_constraint(
    constraint_build_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    try:
        if not await authz_check(
            session.get_user_id(), "delete-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a constraint"
            )
        delete_constraint_build_and_dependencies(constraint_build_id)
    except Exception as e:
        log_info("Failed to delete constraint")
        handle_routes_errors(e)
    return {"message": "Constraint deleted"}


# Mappers
# core to message
def core_to_msg_block(block: Block) -> BlockMessage:
    try:
        data = asdict(block)
    except Exception as e:
        log_info("Failed to convert core Block to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(BlockMessage)
    try:
        b_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core Block to BlockMessage")
        handle_message_errors(e)
    return b_msg


def core_to_msg_missing_property(
    missing_property: MissingProperty,
) -> MissingPropertyMessage:
    try:
        data = asdict(missing_property)
    except Exception as e:
        log_info("Failed to convert core MissingProperty to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(MissingPropertyMessage)
    try:
        mp_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core MissingProperty to MissingPropertyMessage")
        handle_message_errors(e)
    return mp_msg


def core_to_msg_constraint_build(
    constraint_build: ConstraintBuild,
) -> ConstraintBuildMessage:
    blocks = [core_to_msg_block(b) for b in constraint_build.blocks]
    missing_properties = [
        core_to_msg_missing_property(mp) for mp in constraint_build.missing_properties
    ]
    try:
        data = asdict(constraint_build)
    except Exception as e:
        log_info("Failed to convert core ConstraintBuild to dictionary")
        raise MessageTypeError(str(e)) from e
    data["blocks"] = blocks
    data["missing_properties"] = missing_properties
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintBuildMessage)
    try:
        cb_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core ConstraintBuild to ConstraintBuildMessage")
        handle_message_errors(e)
    return cb_msg


# message to core
def msg_to_core_block(msg: BlockMessage) -> Block:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        block = Block(**data_snake)
    except Exception as e:
        log_info("Failed to convert BlockMessage to Block")
        handle_create_core_object_error(e)
    return block


def msg_to_core_constraint_build(
    msg: ConstraintBuildMessage,
) -> ConstraintBuild:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["blocks"] = [msg_to_core_block(b) for b in msg.blocks]
    try:
        constraint_build = ConstraintBuild(**data_snake)
    except Exception as e:
        log_info("Failed to convert ConstraintBuildMessage to ConstraintBuild")
        handle_create_core_object_error(e)
    return constraint_build
