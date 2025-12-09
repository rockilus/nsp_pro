from src.integrations.aws.cognito_client import (
    change_user_password_with_cognito,
)


async def authn_change_password(
    current_password: str,
    new_password: str,
    access_token: str,
) -> None:
    """
    Change user password using AWS Cognito.

    Args:
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
