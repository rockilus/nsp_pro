from typing import List

from fastapi import APIRouter, Depends

from errors import NotAuthorizedError, handle_routes_errors
from integrations.authentication import (
    SessionContainerType,
    authn_get_all_users,
    authn_verify_session,
)
from integrations.authorization import authz_check, authz_get_all_users
from logger import log_info
from routes.api_model import UserMessage
from routes.user_routes import core_to_msg_user
from scripts.setup_database import user_db

router = APIRouter()


@router.get("/admin-dashboard/users")
async def get_current_user(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[UserMessage]:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read", "user", user_id):
            raise NotAuthorizedError("You do not have permission to read the user")
        users = user_db.get_users()
        users_authn = authn_get_all_users()
        users_authz = await authz_get_all_users()
        response = [core_to_msg_user(u) for u in users]
    except Exception as e:
        log_info("Failed to get current user")
        handle_routes_errors(e)
    return response


# @router.put("/users/{user_id}")
# async def update_user(
#     user_id: str,
#     user: UserMessage,
#     session: SessionContainerType = Depends(authn_verify_session()),
# ) -> UserMessage:
#     try:
#         if not await authz_check(
#             session.get_user_id(), "update", "user", user_id
#         ):
#             raise NotAuthorizedError(
#                 "You do not have permission to update a user"
#             )
#         u_data = msg_to_core_user(user)
#         updated_user = await update_user_service(u_data)
#         response = core_to_msg_user(updated_user)
#     except Exception as e:
#         log_info("Failed to update user")
#         handle_routes_errors(e)
#     return response


# @router.put("/users/{user_id}/change-password")
# async def change_user_password(
#     user_id: str,
#     password_data: PasswordDataMessage,
#     session: SessionContainerType = Depends(authn_verify_session()),
# ) -> Dict:
#     try:
#         if not await authz_check(
#             session.get_user_id(), "change-password", "user", user_id
#         ):
#             raise NotAuthorizedError(
#                 "You do not have permission to update a user"
#             )
#         tenant_id = session.get_tenant_id()
#         p_data = msg_to_core_password_data(password_data)
#         if p_data.new_password != p_data.new_password_confirm:
#             raise PasswordsDoNotMatchError("Passwords do not match")
#         await change_user_password_service(user_id, tenant_id, p_data)
#         response = {"message": "Password updated successfully"}
#     except Exception as e:
#         log_info("Failed to update user password")
#         handle_routes_errors(e)
#     return response


# # Mappers
# # core to message
# def core_to_msg_user(user: User) -> UserMessage:
#     try:
#         data = asdict(user)
#     except Exception as e:
#         log_info("Failed to convert User to dictionary")
#         raise MessageTypeError(str(e)) from e
#     as_dict = humps.camelize(data)
#     validator = TypeAdapter(UserMessage)
#     try:
#         u_msg = validator.validate_python(as_dict)
#     except Exception as e:
#         log_info("Failed to convert User to UserMessage")
#         handle_message_errors(e)
#     return u_msg


# # message to core
# def msg_to_core_user(msg: UserMessage) -> User:
#     data_snake = humps.decamelize(msg.model_dump())
#     try:
#         user = User(**data_snake)
#     except Exception as e:
#         log_info("Failed to convert UserMessage to User")
#         handle_create_core_object_error(e)
#     return user


# def msg_to_core_password_data(msg: PasswordDataMessage) -> PasswordData:
#     data_snake = humps.decamelize(msg.model_dump())
#     try:
#         password_data = PasswordData(**data_snake)
#     except Exception as e:
#         log_info("Failed to convert PasswordDataMessage to PasswordData")
#         handle_create_core_object_error(e)
#     return password_data
