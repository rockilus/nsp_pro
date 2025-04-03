from dataclasses import asdict
from typing import Dict

import humps
from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas import PasswordData, User
from shared.schemas.errors import handle_create_schema_object_error

from src.dependencies import get_db_collections, get_user_service
from src.errors import (
    MessageTypeError,
    NotAuthorizedError,
    PasswordsDoNotMatchError,
    handle_message_errors,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.routes.api_model import PasswordDataMessage, UserMessage
from src.services.user_service import UserService

router = APIRouter()


@router.get("/users/me")
async def get_current_user(
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserMessage:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read", "user", user_id):
            raise NotAuthorizedError("You do not have permission to read the user")
        user = db_collections.user_db.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        response = core_to_msg_user(user)
    except Exception as e:
        log_info("Failed to get current user")
        handle_routes_errors(e)
    return response


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user: UserMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    user_service: UserService = Depends(get_user_service),
) -> UserMessage:
    try:
        if not await authz_check(session.get_user_id(), "update", "user", user_id):
            raise NotAuthorizedError("You do not have permission to update a user")
        recipe_user_id = session.get_recipe_user_id()
        tenant_id = session.get_tenant_id()
        u_data = msg_to_core_user(user)
        updated_user = await user_service.update_user(u_data, recipe_user_id, tenant_id)
        response = core_to_msg_user(updated_user)
    except Exception as e:
        log_info("Failed to update user")
        handle_routes_errors(e)
    return response


@router.put("/users/{user_id}/change-password")
async def change_user_password(
    user_id: str,
    password_data: PasswordDataMessage,
    session: SessionContainerType = Depends(authn_verify_session()),
    user_service: UserService = Depends(get_user_service),
) -> Dict:
    try:
        if not await authz_check(
            session.get_user_id(), "change-password", "user", user_id
        ):
            raise NotAuthorizedError("You do not have permission to update a user")
        recipe_user_id = session.get_recipe_user_id()
        tenant_id = session.get_tenant_id()
        p_data = msg_to_core_password_data(password_data)
        if p_data.new_password != p_data.new_password_confirm:
            raise PasswordsDoNotMatchError("Passwords do not match")
        await user_service.change_user_password(
            user_id, recipe_user_id, tenant_id, p_data
        )
        response = {"message": "Password updated successfully"}
    except Exception as e:
        log_info("Failed to update user password")
        handle_routes_errors(e)
    return response


# Mappers
# core to message
def core_to_msg_user(user: User) -> UserMessage:
    try:
        data = asdict(user)
        data.pop("impersonating_user_id")
    except Exception as e:
        log_info("Failed to convert User to dictionary")
        raise MessageTypeError(str(e)) from e
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
    data_snake["impersonating_user_id"] = None
    try:
        user = User(**data_snake)
    except Exception as e:
        log_info("Failed to convert UserMessage to User")
        handle_create_schema_object_error(e)
    return user


def msg_to_core_password_data(msg: PasswordDataMessage) -> PasswordData:
    data_snake = humps.decamelize(msg.model_dump())
    try:
        password_data = PasswordData(**data_snake)
    except Exception as e:
        log_info("Failed to convert PasswordDataMessage to PasswordData")
        handle_create_schema_object_error(e)
    return password_data
