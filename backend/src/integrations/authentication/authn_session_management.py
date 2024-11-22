from fastapi import Request
from supertokens_python.asyncio import get_user
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.asyncio import create_new_session

from errors import UserNotFoundError


async def authn_impersonate_user(
    request: Request, target_user_id: str, impersonator_user_id: str
) -> SessionContainer:
    user = await get_user(target_user_id)
    if not user:
        raise UserNotFoundError("User not found")
    return await create_new_session(
        request=request,
        tenant_id="public",
        recipe_user_id=user.login_methods[0].recipe_user_id,
        access_token_payload={
            "isImpersonation": True,
            "impersonatedUserEmail": user.emails[0],
            "adminUserId": impersonator_user_id,
        },
    )

    # a new session has been created.
    # - an access & refresh token has been attached to the response's cookie
    # - a new row has been inserted into the database for this new session


async def authn_restore_admin_session(
    request: Request,
    target_user_id: str,
):
    user = await get_user(target_user_id)
    if not user:
        raise UserNotFoundError("User not found")
    # Create a new session for the admin user
    return await create_new_session(
        request=request,
        tenant_id="public",
        recipe_user_id=user.login_methods[0].recipe_user_id,
    )
