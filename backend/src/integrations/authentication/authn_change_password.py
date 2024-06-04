from supertokens_python.recipe.emailpassword.asyncio import (
    get_user_by_id,
    sign_in,
    update_email_or_password,
)
from supertokens_python.recipe.emailpassword.interfaces import (
    SignInWrongCredentialsError,
    UpdateEmailOrPasswordOkResult,
    UpdateEmailOrPasswordPasswordPolicyViolationError,
)

from errors import (
    AuthnPasswordChangeError,
    AuthnPasswordPolicyViolationError,
    AuthnUserNotFoundError,
    AuthnWrongCredentialsError,
)


async def authn_change_password(
    user_id: str, tenant_id: str, current_password: str, new_password: str
) -> None:
    # get the signed in user's email from the getUserById function
    users_info = await get_user_by_id(user_id)
    if users_info is None:
        raise AuthnUserNotFoundError("User not found")
    # call signin to check that the input password is correct
    isPasswordValid = await sign_in(
        "public", users_info.email, password=current_password
    )
    if isinstance(isPasswordValid, SignInWrongCredentialsError):
        raise AuthnWrongCredentialsError("Incorrect password")
    # update the users password
    update_response = await update_email_or_password(
        user_id,
        password=new_password,
        tenant_id_for_password_policy=tenant_id,
    )
    if isinstance(update_response, UpdateEmailOrPasswordOkResult):
        return
    if isinstance(update_response, UpdateEmailOrPasswordPasswordPolicyViolationError):
        raise AuthnPasswordPolicyViolationError(str(update_response.failure_reason))
    raise AuthnPasswordChangeError("Unknown error")
