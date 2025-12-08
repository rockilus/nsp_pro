from src.integrations.aws.cognito_client import (
    change_user_password_with_cognito,
)


async def authn_change_password(
    user_id: str,
    recipe_user_id: None,
    tenant_id: str,
    current_password: str,
    new_password: str,
    access_token: str,
) -> None:
    """
    Change user password using AWS Cognito.

    Args:
        user_id: User ID (Cognito sub) - kept for interface compatibility
        recipe_user_id: Legacy parameter, not used with Cognito (pass None)
        tenant_id: Legacy parameter, not used with Cognito
        current_password: User's current password
        new_password: New password to set
        access_token: User's Cognito access token

    Raises:
        AuthnWrongCredentialsError: If current password is incorrect
        AuthnPasswordPolicyViolationError: If new password doesn't meet
            policy requirements
        AuthnUserNotFoundError: If user is not found
        AuthnPasswordChangeError: For other password change failures
    """
    # Use Cognito change_password API with access token
    await change_user_password_with_cognito(
        access_token=access_token,
        current_password=current_password,
        new_password=new_password,
    )
    # users_info = get_user(user_id)

    # if users_info is None:
    #     raise AuthnUserNotFoundError("User not found")

    # # Find the login method for the current user
    # login_method = next(
    #     (
    #         lm
    #         for lm in users_info.login_methods
    #         if lm.recipe_user_id.get_as_string() == recipe_user_id
    #         and lm.recipe_id == "emailpassword"
    #     ),
    #     None,
    # )

    # if login_method is None:
    #     raise AuthnPasswordChangeError(
    #         "User does not have an emailpassword login method"
    #     )

    # email = login_method.email

    # if email is None:
    #     raise AuthnEmailNotFoundForUserError("Email not found for the user")

    # # call signin to check that the input password is correct
    # isPasswordValid = verify_credentials("public", email, password=current_password)

    # if isinstance(isPasswordValid, WrongCredentialsError):
    #     raise AuthnWrongCredentialsError("Incorrect password")

    # # update the users password
    # update_response = update_email_or_password(
    #     recipe_user_id,
    #     password=new_password,
    #     tenant_id_for_password_policy=tenant_id,
    # )

    # if isinstance(update_response, UpdateEmailOrPasswordOkResult):
    #     return
    # if isinstance(update_response, PasswordPolicyViolationError):
    #     raise AuthnPasswordPolicyViolationError(str(update_response.failure_reason))
    # raise AuthnPasswordChangeError("Unknown error")
