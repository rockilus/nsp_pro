"""Backward-compat shim — delegates to CognitoAuthClient.

Prefer importing from
src.integrations.authentication.cognito_auth_client directly.
"""

from src.integrations.authentication.cognito_auth_client import (
    Boto3CognitoAuthClient,
    change_user_password_with_cognito,
)

__all__ = [
    "Boto3CognitoAuthClient",
    "change_user_password_with_cognito",
]
