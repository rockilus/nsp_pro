from dataclasses import asdict
from typing import List

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas.core import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuild,
    ConstraintBuildAugmented,
    ConstraintType,
    MissingAttribute,
    ShiftWorkerOption,
    SWOIdTypes,
)
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_constraint_build_service
from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import (
    BlockMessage,
    ConstraintBuildMessage,
    MissingAttributeMessage,
    ShiftWorkerOptionMessage,
)
from src.services.constraint_build_service import ConstraintBuildService

router = APIRouter()


@router.post("/constraints/teams/{team_id}", status_code=201)
async def create_constraint(
    team_id: str,
    req: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
) -> ConstraintBuildMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "create-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to create a constraint"
            )
        cb_data = msg_to_core_constraint_build(req)
        cb_augmented = constraint_build_service.create_constraint_build(cb_data)
        response = core_to_msg_constraint_build_augmented(cb_augmented)
    except Exception as e:
        log_info("Failed to create constraint")
        handle_routes_errors(e)
    return response


@router.get("/constraints/teams/{team_id}")
async def get_constraints(
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
) -> List[ConstraintBuildMessage]:
    try:
        if not await authz_check(
            session.get_user_id(), "read-constraints", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to get constraints")
        constraint_builds = constraint_build_service.get_constraint_builds(team_id)
        response = [
            core_to_msg_constraint_build_augmented(cb) for cb in constraint_builds
        ]
    except Exception as e:
        log_info("Failed to get constraints")
        handle_routes_errors(e)
    return response


@router.put("/constraints/{constraint_build_id}/teams/{team_id}")
async def update_constraint(
    team_id: str,
    updated_constraint_build: ConstraintBuildMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
) -> ConstraintBuildMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to update a constraint"
            )
        cb_data = msg_to_core_constraint_build(updated_constraint_build)
        cb_updated = constraint_build_service.update_constraint_build(cb_data)
        response = core_to_msg_constraint_build_augmented(cb_updated)
    except Exception as e:
        log_info("Failed to update constraint")
        handle_routes_errors(e)
    return response


@router.delete("/constraints/{constraint_build_id}/teams/{team_id}")
async def delete_constraint(
    constraint_build_id: str,
    team_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
    constraint_build_service: ConstraintBuildService = Depends(
        get_constraint_build_service,
    ),
):
    try:
        if not await authz_check(
            session.get_user_id(), "delete-constraint", "team", team_id
        ):
            raise NotAuthorizedError(
                "You do not have permission to delete a constraint"
            )
        constraint_build_service.delete_constraint_build(team_id, constraint_build_id)
    except Exception as e:
        log_info("Failed to delete constraint")
        handle_routes_errors(e)
    return {"message": "Constraint deleted"}


# Mappers
# core to message
def core_to_msg_shift_worker_option(
    shift_worker_option: ShiftWorkerOption,
) -> ShiftWorkerOptionMessage:
    data = asdict(shift_worker_option)
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ShiftWorkerOptionMessage)
    return validator.validate_python(as_dict)


def core_to_msg_block(block: Block) -> BlockMessage:
    try:
        data = asdict(block)
        if block.type == "shift_worker_option":
            if not isinstance(block.value, list):
                raise ValueError("Invalid value type for shift_worker_option")
            value = [
                core_to_msg_shift_worker_option(v) for v in block.value  # type: ignore
            ]
            data["value"] = value
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
    missing_property: MissingAttribute,
) -> MissingAttributeMessage:
    try:
        data = asdict(missing_property)
    except Exception as e:
        log_info("Failed to convert core MissingProperty to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(MissingAttributeMessage)
    try:
        mp_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core MissingProperty to MissingPropertyMessage")
        handle_message_errors(e)
    return mp_msg


def core_to_msg_constraint_build_augmented(
    cb_augmented: ConstraintBuildAugmented,
) -> ConstraintBuildMessage:
    try:
        data = asdict(cb_augmented)
        blocks = [core_to_msg_block(b) for b in cb_augmented.blocks]
        mps_message = [
            core_to_msg_missing_property(mp) for mp in cb_augmented.missing_attributes
        ]
        data["blocks"] = blocks
        data["missing_properties"] = mps_message
    except Exception as e:
        log_info("Failed to convert core ConstraintBuild to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(ConstraintBuildMessage)
    try:
        cb_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert core ConstraintBuild to ConstraintBuildMessage")
        handle_message_errors(e)
    return cb_msg


# message to core
def msg_to_core_shift_worker_option(
    msg: ShiftWorkerOptionMessage,
) -> ShiftWorkerOption:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["id_type"] = SWOIdTypes(data_snake["id_type"])
    try:
        shift_worker_option = ShiftWorkerOption(**data_snake)
    except Exception as e:
        log_info("Failed to convert ShiftWorkerOptionMessage to ShiftWorkerOption")
        handle_create_schema_object_error(e)
    return shift_worker_option


def msg_to_core_block(msg: BlockMessage) -> Block:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["name"] = BlockNameOptions(data_snake["name"])
    data_snake["type"] = BlockTypeOptions(data_snake["type"])
    if data_snake["type"] == BlockTypeOptions.SHIFT_WORKER_OPTION:
        if not isinstance(msg.value, list):
            raise ValueError("Invalid value type for shift_worker_option")
        value = [msg_to_core_shift_worker_option(v) for v in msg.value]  # type: ignore
        data_snake["value"] = value
    try:
        block = Block(**data_snake)
    except Exception as e:
        log_info("Failed to convert BlockMessage to Block")
        handle_create_schema_object_error(e)
    return block


def msg_to_core_constraint_build(
    msg: ConstraintBuildMessage,
) -> ConstraintBuild:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["constraint_type"] = ConstraintType(data_snake["constraint_type"])
    data_snake["blocks"] = [msg_to_core_block(b) for b in msg.blocks]
    data_snake.pop("text")
    data_snake.pop("active")
    data_snake.pop("missing_attributes")
    try:
        constraint_build = ConstraintBuild(**data_snake)
    except Exception as e:
        log_info("Failed to convert ConstraintBuildMessage to ConstraintBuild")
        handle_create_schema_object_error(e)
    return constraint_build
