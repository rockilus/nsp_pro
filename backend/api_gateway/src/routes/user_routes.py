from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from shared.database.database_collections import DatabaseCollections
from shared.logger import log_info
from shared.schemas.core import PasswordData, User
from shared.schemas.dto.user import PasswordDataDTO, UserDTO

from src.dependencies import get_db_collections, get_user_service
from src.errors import (
    NotAuthorizedError,
    PasswordsDoNotMatchError,
    handle_routes_errors,
)
from src.integrations.authentication import (
    SessionContainerType,
    authn_verify_session,
)
from src.integrations.authorization import authz_check
from src.services.user_service import UserService

router = APIRouter()


@router.get("/users/me")
async def get_current_user(
    session: SessionContainerType = Depends(authn_verify_session()),
    db_collections: DatabaseCollections = Depends(get_db_collections),
) -> UserDTO:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read", "user", user_id):
            raise NotAuthorizedError("You do not have permission to read the user")
        user = db_collections.user_db.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        response = user.to_dto()
    except Exception as e:
        log_info("Failed to get current user")
        handle_routes_errors(e)
    return response


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user: UserDTO,
    session: SessionContainerType = Depends(authn_verify_session()),
    user_service: UserService = Depends(get_user_service),
) -> UserDTO:
    try:
        if not await authz_check(session.get_user_id(), "update", "user", user_id):
            raise NotAuthorizedError("You do not have permission to update a user")
        recipe_user_id = session.get_recipe_user_id()
        tenant_id = session.get_tenant_id()
        u_data = User.from_dto(user)
        updated_user = await user_service.update_user(u_data, recipe_user_id, tenant_id)
        response = updated_user.to_dto()
    except Exception as e:
        log_info("Failed to update user")
        handle_routes_errors(e)
    return response


@router.put("/users/{user_id}/change-password")
async def change_user_password(
    user_id: str,
    password_data: PasswordDataDTO,
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
        p_data = PasswordData.from_dto(password_data)
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
