"""AWS Cognito Identity Provider client for authentication operations."""

from functools import lru_cache

import boto3  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
from shared.logger import log_error, log_info

from src.config import config
from src.errors import (
    AuthnPasswordChangeError,
    AuthnPasswordPolicyViolationError,
    AuthnUserNotFoundError,
    AuthnWrongCredentialsError,
)


@lru_cache(maxsize=1)
def get_cognito_client():
    """
    Get AWS Cognito Identity Provider client with caching.

    Returns a boto3 Cognito IDP client configured for the current environment.
    In development, uses endpoint_url if specified. In production, uses
    default AWS configuration.

    Returns:
        boto3.client: Configured Cognito Identity Provider client
    """
    client_kwargs = {
        "service_name": "cognito-idp",
        "region_name": config.aws_region,
    }

    # Add endpoint URL for local development (e.g., LocalStack)
    if config.endpoint_url:
        client_kwargs["endpoint_url"] = config.endpoint_url

    log_info(f"Initializing Cognito client for region: {config.aws_region}")

    return boto3.client(**client_kwargs)


async def change_user_password_with_cognito(
    access_token: str,
    current_password: str,
    new_password: str,
) -> None:
    """
    Change user password using AWS Cognito change_password API.

    This follows AWS best practices by using the user's access token
    to authenticate the password change request. Cognito validates
    the current password and enforces password policy automatically.

    Args:
        access_token: Valid Cognito access token for the user
        current_password: User's current password
        new_password: New password to set

    Raises:
        AuthnWrongCredentialsError: If current password is incorrect
        AuthnPasswordPolicyViolationError: If new password doesn't meet
            policy requirements
        AuthnUserNotFoundError: If user is not found
        AuthnPasswordChangeError: For other password change failures
    """
    client = get_cognito_client()

    try:
        log_info("Attempting to change user password via Cognito")

        client.change_password(
            AccessToken=access_token,
            PreviousPassword=current_password,
            ProposedPassword=new_password,
        )

        log_info("Successfully changed user password via Cognito")

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        error_message = e.response["Error"]["Message"]

        log_error(f"Cognito password change failed: {error_code} - {error_message}")

        # Map Cognito errors to application-specific errors
        if error_code == "NotAuthorizedException":
            raise AuthnWrongCredentialsError("Current password is incorrect") from e
        if error_code == "InvalidPasswordException":
            raise AuthnPasswordPolicyViolationError(error_message) from e
        if error_code == "UserNotFoundException":
            raise AuthnUserNotFoundError("User not found") from e
        if error_code == "PasswordHistoryPolicyViolationException":
            raise AuthnPasswordPolicyViolationError(
                "This password has been used recently. "
                "Please choose a different password."
            ) from e
        if error_code == "TooManyRequestsException":
            raise AuthnPasswordChangeError(
                "Too many password change attempts. Please try again later."
            ) from e
        if error_code == "LimitExceededException":
            raise AuthnPasswordChangeError(
                "Request limit exceeded. Please try again later."
            ) from e
        if error_code == "UserNotConfirmedException":
            raise AuthnPasswordChangeError("User account not confirmed") from e
        raise AuthnPasswordChangeError(
            f"Failed to change password: {error_code}"
        ) from e
