from dataclasses import asdict
from typing import Dict, List

import humps
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter
from shared.logger import log_info
from shared.schemas import UserAuth, UserDashboard

from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import (
    SessionContainerType,
    authn_delete_user,
    authn_get_all_users,
    authn_get_user,
    authn_impersonate_user,
    authn_restore_admin_session,
    authn_verify_session,
)
from integrations.authorization import (
    authz_check,
    authz_delete_user,
    authz_get_all_users,
    authz_get_user,
)
from routes.api_model import UserAuthMessage, UserDashboardMessage
from routes.user_routes import core_to_msg_user
from scripts.setup_database import user_db
from services.user_services import (
    build_user_dashboard,
    update_user_impersonating_user_id,
)

router = APIRouter()


@router.get("/admin-dashboard/check-authz")
async def check_dashboard_authz(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    user_id = session.get_user_id()
    if not await authz_check(user_id, "read-dashboard", "admin"):
        raise NotAuthorizedError("You do not have permission to view the dashboard")
    return {"message": "You have permission to view the dashboard"}


@router.get("/admin-dashboard/users")
async def get_users(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[UserDashboardMessage]:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read-users", "admin"):
            raise NotAuthorizedError("You do not have permission to read users")
        users = user_db.get_users()
        users_authn = await authn_get_all_users()
        users_authz = await authz_get_all_users()
        users_dashboard = build_user_dashboard(users, users_authn, users_authz)
        response = [core_to_msg_user_dashboard(ud) for ud in users_dashboard]
    except Exception as e:
        log_info("Failed to get users dashboard")
        handle_routes_errors(e)
    return response


@router.get("/admin-dashboard/users/{target_user_id}")
async def get_user(
    target_user_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> UserDashboardMessage:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read-user", "admin"):
            raise NotAuthorizedError("You do not have permission to read a user")
        user = user_db.get_user_by_id(target_user_id)
        user_authn = await authn_get_user(target_user_id)
        user_authz = await authz_get_user(target_user_id)
        user_dashboard = UserDashboard(
            user=user, user_authn=user_authn, user_authz=user_authz
        )
        response = core_to_msg_user_dashboard(user_dashboard)
    except Exception as e:
        log_info("Failed to get user dashboard")
        handle_routes_errors(e)
    return response


@router.post("/admin-dashboard/impersonate")
async def impersonate(
    request: Request,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    user_id = session.get_user_id()
    if not await authz_check(user_id, "create-impersonation", "admin"):
        raise NotAuthorizedError("You do not have permission to impersonate users")
    data = await request.json()
    target_user_id = data.get("user_id", None)
    if not target_user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    await session.revoke_session()
    await authn_impersonate_user(request, target_user_id, user_id)
    update_user_impersonating_user_id(user_id, target_user_id)
    return JSONResponse({"message": "Impersonation complete!"})


@router.post("/admin-dashboard/restore-session")
async def restore_admin_session(
    request: Request,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    user_id = session.get_user_id()
    access_token_payload = session.get_access_token_payload()
    # Check if this is an impersonated session
    if not access_token_payload.get("isImpersonation"):
        raise HTTPException(
            status_code=400,
            detail="You do not have permission to restore the admin session",
        )
    # Get the admin's user ID from the access token payload
    admin_user_id = access_token_payload.get("adminUserId", None)
    if not admin_user_id:
        raise HTTPException(
            status_code=400,
            detail="You do not have permission to restore the admin session",
        )
    if not await authz_check(admin_user_id, "delete-impersonation", "admin"):
        raise NotAuthorizedError(
            "You do not have permission to restore the admin session"
        )
    admin_user = user_db.get_user_by_id(admin_user_id)
    if not admin_user:
        raise HTTPException(status_code=400, detail="Admin user not found")
    if admin_user.impersonating_user_id != user_id:
        raise HTTPException(
            status_code=400,
            detail="You do not have permission to restore the admin session",
        )
    # Revoke the current impersonated session
    await session.revoke_session()
    await authn_restore_admin_session(request, admin_user_id)
    update_user_impersonating_user_id(admin_user_id, None)
    return {"message": "Admin session restored"}


@router.delete("/admin-dashboard/users/{target_user_id}")
async def delete_user(
    target_user_id: str,
    session: SessionContainerType = Depends(authn_verify_session()),
) -> Dict:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "delete-user", "admin"):
            raise NotAuthorizedError("You do not have permission to delete users")
        user = user_db.get_user_by_id(target_user_id)
        if user:
            raise HTTPException(status_code=400, detail="User can't be deleted")
        user_authn = await authn_get_user(target_user_id)
        if user_authn:
            await authn_delete_user(target_user_id)
        user_authz = await authz_get_user(target_user_id)
        if user_authz:
            await authz_delete_user(target_user_id)
    except Exception as e:
        log_info("Failed to get users dashboard")
        handle_routes_errors(e)
    return {"message": "User deleted"}


# # Mappers
# # core to message
def core_to_msg_user_auth(user_auth: UserAuth) -> UserAuthMessage:
    try:
        data = asdict(user_auth)
    except Exception as e:
        log_info("Failed to convert UserAuth to dictionary")
        raise MessageTypeError(str(e)) from e
    as_dict = humps.camelize(data)
    validator = TypeAdapter(UserAuthMessage)
    try:
        ua_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert UserAuth to UserAuthMessage")
        handle_message_errors(e)
    return ua_msg


def core_to_msg_user_dashboard(
    user_dashboard: UserDashboard,
) -> UserDashboardMessage:
    try:
        data = asdict(user_dashboard)
    except Exception as e:
        log_info("Failed to convert UserDashboard to dictionary")
        raise MessageTypeError(str(e)) from e
    data["user"] = (
        core_to_msg_user(user_dashboard.user) if user_dashboard.user else None
    )
    data["user_authn"] = (
        core_to_msg_user_auth(user_dashboard.user_authn)
        if user_dashboard.user_authn
        else None
    )
    data["user_authz"] = (
        core_to_msg_user_auth(user_dashboard.user_authz)
        if user_dashboard.user_authz
        else None
    )
    as_dict = humps.camelize(data)
    validator = TypeAdapter(UserDashboardMessage)
    try:
        ud_msg = validator.validate_python(as_dict)
    except Exception as e:
        log_info("Failed to convert UserDashboard to UserDashboardMessage")
        handle_message_errors(e)
    return ud_msg
