"""AuthService — orchestrates Cognito auth operations with business logic."""

import base64
import json

from shared.schemas.dto.auth import (
    ChangeEmailRequestDTO,
    ConfirmCodeRequestDTO,
    ConfirmForgotPasswordRequestDTO,
    ForgotPasswordRequestDTO,
    ResendCodeRequestDTO,
    SignInRequestDTO,
    SignUpRequestDTO,
    VerifyEmailRequestDTO,
)

from src.config import config
from src.errors import PasswordsDoNotMatchError, SecurityViolation
from src.integrations.authentication.cognito_auth_client import (
    AuthTokens,
    CognitoAuthClient,
)


class AuthService:
    def __init__(self, auth_client: CognitoAuthClient) -> None:
        self._auth = auth_client

    async def sign_up(self, request: SignUpRequestDTO) -> str:
        if request.password != request.confirm_password:
            raise PasswordsDoNotMatchError("Passwords do not match")
        return await self._auth.sign_up(
            email=request.email,
            password=request.password,
            given_name=request.first_name,
            family_name=request.last_name,
        )

    async def confirm_sign_up(self, request: ConfirmCodeRequestDTO) -> None:
        await self._auth.confirm_sign_up(
            email=request.email,
            code=request.code,
        )

    async def sign_in(self, request: SignInRequestDTO) -> AuthTokens:
        return await self._auth.initiate_auth(
            email=request.email,
            password=request.password,
        )

    async def refresh(self, refresh_token: str) -> AuthTokens:
        return await self._auth.refresh_auth(refresh_token)

    async def sign_out(self, access_token: str) -> None:
        await self._auth.global_sign_out(access_token)

    async def forgot_password(self, request: ForgotPasswordRequestDTO) -> None:
        await self._auth.forgot_password(email=request.email)

    async def confirm_forgot_password(
        self, request: ConfirmForgotPasswordRequestDTO
    ) -> None:
        await self._auth.confirm_forgot_password(
            email=request.email,
            code=request.code,
            new_password=request.new_password,
        )

    async def change_email(
        self, access_token: str, request: ChangeEmailRequestDTO
    ) -> None:
        await self._auth.update_user_email(
            access_token=access_token,
            new_email=request.new_email,
        )

    async def verify_email(
        self, access_token: str, request: VerifyEmailRequestDTO
    ) -> None:
        await self._auth.verify_user_email_attribute(
            access_token=access_token,
            code=request.code,
        )

    async def resend_code(self, request: ResendCodeRequestDTO) -> None:
        await self._auth.resend_confirmation_code(email=request.email)

    async def admin_confirm_user_in_cognito(self, email: str) -> None:
        """Admin-confirm a user bypassing OTP — forbidden in production."""
        if config.environment == "production":
            raise SecurityViolation("Admin bypass forbidden in production")
        await self._auth.admin_confirm_sign_up(email)

    @staticmethod
    def decode_token_sub(token: str) -> str:
        """Extract the sub claim from a JWT without full verification."""
        parts = token.split(".")
        if len(parts) < 2:
            return token[:32]
        padded = parts[1] + "=="
        try:
            payload = base64.urlsafe_b64decode(padded)
            return json.loads(payload)["sub"]
        except Exception:
            return token[:32]
