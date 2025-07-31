from supertokens_python.types import RecipeUserId


async def authn_change_password(
    user_id: str,
    recipe_user_id: RecipeUserId,
    tenant_id: str,
    current_password: str,
    new_password: str,
) -> None:
    # get the signed in user's email from the getUserById function
    print(
        "TO COME",
        user_id,
        recipe_user_id,
        tenant_id,
        current_password,
        new_password,
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
