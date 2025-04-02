from dataclasses import asdict

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import Attribute, AttributeOwnerType
from shared.schemas.errors import handle_create_schema_object_error

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
from src.routes.api_model import AttributeMessage
from src.services.attribute_services import create_or_update_attribute

router = APIRouter()


@router.put("/attributes/teams/{team_id}")
async def update_attribute(
    team_id: str,
    attribute: AttributeMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> AttributeMessage:
    try:
        if not await authz_check(
            session.get_user_id(), "update-shift-property", "team", team_id
        ):
            raise NotAuthorizedError("You do not have permission to update attributes")
        sp_data = msg_to_core_attribute(attribute)
        new_sp = create_or_update_attribute(sp_data)
        response = core_to_msg_attribute(new_sp)
    except Exception as e:
        log_info("Failed to update attribute")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_attribute(attribute: Attribute) -> AttributeMessage:
    try:
        data = asdict(attribute)
    except Exception as e:
        log_info("Failed to convert Attribute to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(AttributeMessage)
    try:
        sp_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert Attribute to AttributeMessage")
        handle_message_errors(e)
    return sp_msg


# message to core
def msg_to_core_attribute(msg: AttributeMessage) -> Attribute:
    data_snake = humps.decamelize(msg.model_dump())
    data_snake["owner_type"] = AttributeOwnerType(data_snake["owner_type"])
    try:
        attribute = Attribute(**data_snake)
    except Exception as e:
        log_info("Failed to convert AttributeMessage to Attribute")
        handle_create_schema_object_error(e)
    return attribute
