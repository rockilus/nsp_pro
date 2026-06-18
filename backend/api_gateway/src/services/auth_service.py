"""AuthService — orchestrates Cognito auth operations with business logic."""

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

from src.errors import PasswordsDoNotMatchError
from src.integrations.authentication.cognito_auth_client import (
    AuthTokens,
    CognitoAuthClient,
)


class AuthService:
    def __init__(self, auth_client: CognitoAuthClient) -> None:
        self._auth = auth_client

    async def sign_up(self, request: SignUpRequestDTO) -> None:
        if request.password != request.confirm_password:
            raise PasswordsDoNotMatchError("Passwords do not match")
        await self._auth.sign_up(
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
