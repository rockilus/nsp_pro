"""ABC + Boto3 implementation of Cognito auth operations.

All Cognito Identity Provider calls live here. The ABC allows test mocking.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import lru_cache

import boto3  # type: ignore
from botocore.exceptions import ClientError  # type: ignore
from shared.logger import log_error, log_info

from src.config import config
from src.errors import (
    AuthnConnectionError,
    AuthnEmailAlreadyExistsError,
    AuthnPasswordPolicyViolationError,
    AuthnUpdateEmailError,
    AuthnUserNotFoundError,
    AuthnUserNotConfirmedError,
    AuthnWrongCredentialsError,
)


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    id_token: str
    refresh_token: str
    expires_in: int


# ---------------------------------------------------------------------------
# ABC
# ---------------------------------------------------------------------------


class CognitoAuthClient(ABC):
    """Interface for all Cognito auth operations — injectable for tests."""

    @abstractmethod
    async def sign_up(
        self, email: str, password: str, given_name: str, family_name: str
    ) -> str:
        """Register a new user. Returns the Cognito sub (user ID)."""

    @abstractmethod
    async def confirm_sign_up(self, email: str, code: str) -> None:
        """Confirm a user's sign-up with the emailed code."""

    @abstractmethod
    async def admin_confirm_sign_up(self, email: str) -> None:
        """Admin confirm without a code (dev / admin override)."""

    @abstractmethod
    async def resend_confirmation_code(self, email: str) -> None:
        """Re-send the sign-up confirmation code."""

    @abstractmethod
    async def initiate_auth(self, email: str, password: str) -> AuthTokens:
        """Sign in via ADMIN_NO_SRP_AUTH — returns tokens."""

    @abstractmethod
    async def refresh_auth(self, refresh_token: str) -> AuthTokens:
        """Get new access + id tokens using a refresh token."""

    @abstractmethod
    async def change_password(
        self, access_token: str, old_password: str, new_password: str
    ) -> None:
        """Change an authenticated user's password."""

    @abstractmethod
    async def forgot_password(self, email: str) -> None:
        """Trigger the forgot-password flow — Cognito sends a code."""

    @abstractmethod
    async def confirm_forgot_password(
        self, email: str, code: str, new_password: str
    ) -> None:
        """Complete the forgot-password flow with the code."""

    @abstractmethod
    async def update_user_email(self, access_token: str, new_email: str) -> None:
        """Change the user's email — Cognito sends a verification code."""

    @abstractmethod
    async def verify_user_email_attribute(self, access_token: str, code: str) -> None:
        """Verify the new email address with the code."""

    @abstractmethod
    async def global_sign_out(self, access_token: str) -> None:
        """Sign the user out of all devices."""


# ---------------------------------------------------------------------------
# Boto3 implementation
# ---------------------------------------------------------------------------

_COGNITO_ERROR_MAP: dict[str, type[Exception]] = {
    "NotAuthorizedException": AuthnWrongCredentialsError,
    "UserNotFoundException": AuthnUserNotFoundError,
    "UsernameExistsException": AuthnEmailAlreadyExistsError,
    "InvalidPasswordException": AuthnPasswordPolicyViolationError,
    "PasswordHistoryPolicyViolationException": AuthnPasswordPolicyViolationError,
    "CodeMismatchException": AuthnWrongCredentialsError,
    "ExpiredCodeException": AuthnWrongCredentialsError,
    "TooManyRequestsException": AuthnConnectionError,
    "LimitExceededException": AuthnConnectionError,
    "AliasExistsException": AuthnEmailAlreadyExistsError,
    "UserNotConfirmedException": AuthnUserNotConfirmedError,
    "InvalidParameterException": AuthnUpdateEmailError,
}


def _map_cognito_error(error: ClientError) -> Exception:
    code = error.response["Error"]["Code"]
    message = error.response["Error"]["Message"]
    exc_cls = _COGNITO_ERROR_MAP.get(code)
    if exc_cls is not None:
        return exc_cls(message)
    return AuthnConnectionError(f"Cognito error {code}: {message}")


@lru_cache(maxsize=1)
def _get_raw_cognito_client():
    client_kwargs = {
        "service_name": "cognito-idp",
        "region_name": config.aws_region,
    }
    if config.cognito_endpoint_url:
        client_kwargs["endpoint_url"] = config.cognito_endpoint_url
    elif config.endpoint_url:
        client_kwargs["endpoint_url"] = config.endpoint_url
    log_info(f"Initializing Cognito client for region: {config.aws_region}")
    return boto3.client(**client_kwargs)  # type: ignore


class Boto3CognitoAuthClient(CognitoAuthClient):
    def __init__(self) -> None:
        self._client = _get_raw_cognito_client()
        self._pool_id = config.cognito_user_pool_id
        self._client_id = config.cognito_client_id

    # -- sign-up flow -------------------------------------------------------

    async def sign_up(
        self, email: str, password: str, given_name: str, family_name: str
    ) -> str:
        log_info(f"Signing up user: {email}")
        try:
            resp = self._client.sign_up(
                ClientId=self._client_id,
                Username=email,
                Password=password,
                UserAttributes=[
                    {"Name": "email", "Value": email},
                    {"Name": "given_name", "Value": given_name},
                    {"Name": "family_name", "Value": family_name},
                ],
            )
            return resp["UserSub"]
        except ClientError as e:
            log_error(f"Sign-up failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    async def confirm_sign_up(self, email: str, code: str) -> None:
        log_info(f"Confirming sign-up for: {email}")
        try:
            self._client.confirm_sign_up(
                ClientId=self._client_id,
                Username=email,
                ConfirmationCode=code,
            )
        except ClientError as e:
            log_error(f"Confirm sign-up failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    async def admin_confirm_sign_up(self, email: str) -> None:
        log_info(f"Admin-confirming sign-up for: {email}")
        try:
            self._client.admin_confirm_sign_up(
                UserPoolId=self._pool_id,
                Username=email,
            )
        except ClientError as e:
            log_error(f"Admin confirm sign-up failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    async def resend_confirmation_code(self, email: str) -> None:
        log_info(f"Resending confirmation code to: {email}")
        try:
            self._client.resend_confirmation_code(
                ClientId=self._client_id,
                Username=email,
            )
        except ClientError as e:
            log_error(f"Resend confirmation code failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    # -- sign-in flow -------------------------------------------------------

    @staticmethod
    def _auth_flow() -> str:
        """cognito-local only supports USER_PASSWORD_AUTH."""
        return "USER_PASSWORD_AUTH" if config.cognito_endpoint_url else "ADMIN_NO_SRP_AUTH"

    async def initiate_auth(self, email: str, password: str) -> AuthTokens:
        log_info(f"Initiating auth for: {email}")
        flow = self._auth_flow()
        try:
            resp = self._client.admin_initiate_auth(
                UserPoolId=self._pool_id,
                ClientId=self._client_id,
                AuthFlow=flow,
                AuthParameters={
                    "USERNAME": email,
                    "PASSWORD": password,
                },
            )
            auth = resp["AuthenticationResult"]
            return AuthTokens(
                access_token=auth["AccessToken"],
                id_token=auth["IdToken"],
                refresh_token=auth.get("RefreshToken", ""),
                expires_in=auth["ExpiresIn"],
            )
        except ClientError as e:
            log_error(f"Initiate auth failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    async def refresh_auth(self, refresh_token: str) -> AuthTokens:
        log_info("Refreshing auth tokens")
        try:
            resp = self._client.admin_initiate_auth(
                UserPoolId=self._pool_id,
                ClientId=self._client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={
                    "REFRESH_TOKEN": refresh_token,
                },
            )
            auth = resp["AuthenticationResult"]
            return AuthTokens(
                access_token=auth["AccessToken"],
                id_token=auth["IdToken"],
                refresh_token=auth.get("RefreshToken", refresh_token),
                expires_in=auth["ExpiresIn"],
            )
        except ClientError as e:
            log_error(f"Refresh auth failed: {e}")
            raise _map_cognito_error(e) from e

    # -- password management ------------------------------------------------

    async def change_password(
        self, access_token: str, old_password: str, new_password: str
    ) -> None:
        log_info("Changing password")
        try:
            self._client.change_password(
                AccessToken=access_token,
                PreviousPassword=old_password,
                ProposedPassword=new_password,
            )
        except ClientError as e:
            log_error(f"Change password failed: {e}")
            raise _map_cognito_error(e) from e

    async def forgot_password(self, email: str) -> None:
        log_info(f"Sending forgot-password code to: {email}")
        try:
            self._client.forgot_password(
                ClientId=self._client_id,
                Username=email,
            )
        except ClientError as e:
            log_error(f"Forgot password failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    async def confirm_forgot_password(
        self, email: str, code: str, new_password: str
    ) -> None:
        log_info(f"Confirming forgot password for: {email}")
        try:
            self._client.confirm_forgot_password(
                ClientId=self._client_id,
                Username=email,
                ConfirmationCode=code,
                Password=new_password,
            )
        except ClientError as e:
            log_error(f"Confirm forgot password failed for {email}: {e}")
            raise _map_cognito_error(e) from e

    # -- email management ---------------------------------------------------

    async def update_user_email(self, access_token: str, new_email: str) -> None:
        log_info("Updating user email")
        try:
            self._client.update_user_attributes(
                AccessToken=access_token,
                UserAttributes=[
                    {"Name": "email", "Value": new_email},
                ],
            )
        except ClientError as e:
            log_error(f"Update user email failed: {e}")
            raise _map_cognito_error(e) from e

    async def verify_user_email_attribute(self, access_token: str, code: str) -> None:
        log_info("Verifying user email attribute")
        try:
            self._client.verify_user_attribute(
                AccessToken=access_token,
                AttributeName="email",
                Code=code,
            )
        except ClientError as e:
            log_error(f"Verify user email attribute failed: {e}")
            raise _map_cognito_error(e) from e

    # -- session management -------------------------------------------------

    async def global_sign_out(self, access_token: str) -> None:
        log_info("Global sign-out")
        try:
            self._client.global_sign_out(
                AccessToken=access_token,
            )
        except ClientError as e:
            log_error(f"Global sign-out failed: {e}")
            raise _map_cognito_error(e) from e


# Re-export the old functional helpers as thin wrappers for backward compat.
# These will be removed once all callers are migrated.
_boto3_client = Boto3CognitoAuthClient()


async def change_user_password_with_cognito(
    access_token: str,
    current_password: str,
    new_password: str,
) -> None:
    await _boto3_client.change_password(access_token, current_password, new_password)
