from dataclasses import asdict

import humps
from fastapi import APIRouter, Depends
from pydantic import TypeAdapter

from core import User
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
from routes.api_model import User as UserMessage
from scripts.setup_database import user_db

# from scripts.setup_database import user_db

router = APIRouter()


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user: UserMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> UserMessage:
    try:
        if not await authz_check(session.get_user_id(), "update-user", "user", user_id):
            raise NotAuthorizedError("You do not have permission to update a user")
        u_data = msg_to_core_user(user)
        updated_user = user_db.update_user(u_data)
        response = core_to_msg_user(updated_user)
    except Exception as e:
        log_info("Failed to update user")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_user(user: User) -> UserMessage:
    try:
        data = asdict(user)
    except Exception as e:
        log_info("Failed to convert User to dictionary")
        raise MessageTypeError(str(e)) from e
    data = {k: v for k, v in data.items() if k not in ["hashed_password", "roles"]}
    as_dict = humps.camelize(data)
    validator = TypeAdapter(UserMessage)
    try:
        u_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert User to UserMessage")
        handle_message_errors(e)
    return u_msg


# message to core
def msg_to_core_user(msg: UserMessage) -> User:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        user = User(**data_snake)
    except Exception as e:
        log_info("Failed to convert UserMessage to User")
        handle_create_core_object_error(e)
    return user
