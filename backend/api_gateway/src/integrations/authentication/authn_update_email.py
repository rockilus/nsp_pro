from supertokens_python.recipe.accountlinking.syncio import is_email_change_allowed
from supertokens_python.recipe.emailpassword.interfaces import (
    EmailAlreadyExistsError,
    UpdateEmailOrPasswordOkResult,
)
from supertokens_python.recipe.emailpassword.syncio import update_email_or_password
from supertokens_python.recipe.emailverification.syncio import (
    is_email_verified,
    send_email_verification_email,
)
from supertokens_python.syncio import get_user, list_users_by_account_info
from supertokens_python.types import AccountInfo, RecipeUserId

from errors import (
    AuthnEmailAlreadyExistsError,
    AuthnEmailChangeNotAllowedError,
    AuthnUpdateEmailError,
)


async def authn_update_user_email(
    user_id: str, recipe_user_id: RecipeUserId, tenant_id: str, email: str
) -> None:
    # Then, we check if the email is verified for this user ID or not.
    # It is important to understand that SuperTokens stores email verification
    # status based on the user ID AND the email, and not just the email.
    is_verified = is_email_verified(recipe_user_id, email)

    if not is_verified:
        if not is_email_change_allowed(recipe_user_id, email, False):
            # Email change is not allowed, send a 400 error
            raise AuthnEmailChangeNotAllowedError("Email change not allowed")
        # Before sending a verification email, we check if the email is already
        # being used by another user. If it is, we throw an error.
        user = get_user(user_id)

        if user is not None:
            for t_id in user.tenant_ids:
                users_with_same_email = list_users_by_account_info(
                    t_id, AccountInfo(email=email)
                )
                for curr_user in users_with_same_email:
                    # Since one user can be shared across many tenants, we need
                    # to check if the email already exists in any of the tenants
                    # that belongs to this user.
                    if curr_user.id != user_id:
                        # email already exists with another user.
                        raise AuthnEmailAlreadyExistsError("Email already exists")

        # Create and send the email verification link to the user for the new email.
        send_email_verification_email(tenant_id, user_id, recipe_user_id, email)

        # send successful email verification response
        return

    # update the users email
    update_response = update_email_or_password(recipe_user_id, email=email)

    if isinstance(update_response, UpdateEmailOrPasswordOkResult):
        # send successful email update response
        return

    if isinstance(update_response, EmailAlreadyExistsError):
        raise AuthnEmailAlreadyExistsError(str(update_response))

    raise AuthnUpdateEmailError("Unknown error")
