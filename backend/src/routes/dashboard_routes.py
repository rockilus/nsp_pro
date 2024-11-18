from dataclasses import asdict
from typing import List

import humps

# from supertokens_python.asyncio import get_user
# from supertokens_python.types import AccountInfo
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter
from supertokens_python.recipe.emailpassword.asyncio import get_user_by_id

# from supertokens_python.recipe.session.framework.fastapi import verify_session
from supertokens_python.recipe.session.asyncio import create_new_session

from core import UserAuth, UserDashboard
from errors import (
    MessageTypeError,
    NotAuthorizedError,
    handle_message_errors,
    handle_routes_errors,
)
from integrations.authentication import (
    SessionContainerType,
    authn_get_all_users,
    authn_verify_session,
)
from integrations.authorization import authz_check, authz_get_all_users
from logger import log_info
from routes.api_model import UserAuthMessage, UserDashboardMessage
from routes.user_routes import core_to_msg_user
from scripts.setup_database import user_db
from services.user_services import build_user_dashboard

# from supertokens_python.recipe.session import SessionContainer
# from supertokens_python.recipe.userroles import UserRoleClaim


router = APIRouter()


@router.get("/admin-dashboard/users")
async def get_current_user(
    session: SessionContainerType = Depends(authn_verify_session()),
) -> List[UserDashboardMessage]:
    try:
        user_id = session.get_user_id()
        if not await authz_check(user_id, "read", "user", user_id):
            raise NotAuthorizedError(
                "You do not have permission to read the user dashboard"
            )
        users = user_db.get_users()
        users_authn = authn_get_all_users()
        users_authz = await authz_get_all_users()
        users_dashboard = build_user_dashboard(users, users_authn, users_authz)
        response = [core_to_msg_user_dashboard(ud) for ud in users_dashboard]
    except Exception as e:
        log_info("Failed to get users dashboard")
        handle_routes_errors(e)
    return response


@router.post("/admin-dashboard/impersonate")
async def impersonate(
    request: Request,
    session: SessionContainerType = Depends(authn_verify_session()),
):
    user_id = session.get_user_id()
    if not await authz_check(user_id, "read", "user", user_id):
        raise NotAuthorizedError(
            "You do not have permission to read the user dashboard"
        )
    data = await request.json()
    target_user_id = data.get("user_id", None)
    if not target_user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    # we use the email password recipe here, but you can use the recipe you use
    # user = await list_users_by_account_info("public", AccountInfo(email=email))
    # user = await get_user(user_id)
    user = await get_user_by_id(target_user_id)

    if user is None:
        # return a 400 error to the client
        return

    await create_new_session(
        request,
        "public",
        # user[0].login_methods[0].recipe_user_id,
        target_user_id,
        {"isImpersonation": True},
    )

    # a new session has been created.
    # - an access & refresh token has been attached to the response's cookie
    # - a new row has been inserted into the database for this new session

    return JSONResponse({"message": "Impersonation complete!"})


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
