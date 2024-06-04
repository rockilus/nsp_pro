from supertokens_python.recipe.emailpassword.asyncio import update_email_or_password
from supertokens_python.recipe.emailpassword.interfaces import (
    UpdateEmailOrPasswordEmailAlreadyExistsError,
    UpdateEmailOrPasswordOkResult,
)

from errors import AuthnEmailAlreadyExistsError, AuthnUpdateEmailError


async def authn_update_user_email(user_id: str, email: str) -> None:
    update_response = await update_email_or_password(user_id, email=email)
    if isinstance(update_response, UpdateEmailOrPasswordOkResult):
        return
    if isinstance(update_response, UpdateEmailOrPasswordEmailAlreadyExistsError):
        raise AuthnEmailAlreadyExistsError(str(update_response))
    raise AuthnUpdateEmailError("Unknown error")
