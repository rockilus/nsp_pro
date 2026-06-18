"""Auth routes — cookie-based custom auth UI backend.

All endpoints are unauthenticated (no get_user_context dependency).
Tokens flow via HttpOnly cookies, never in response bodies.
"""

from typing import Dict

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from shared.logger import log_info
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
from src.dependencies.auth_service import get_auth_service
from src.errors import PasswordsDoNotMatchError, handle_routes_errors
from src.integrations.authentication.cognito_auth_client import AuthTokens
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _cookie_domain() -> str | None:
    return getattr(config, "cookie_domain", None)


def _set_auth_cookies(response: Response, tokens: AuthTokens) -> None:
    is_dev = config.environment == "development"
    domain = None if is_dev else _cookie_domain()
    response.set_cookie(
        key="rockilus_access_token",
        value=tokens.access_token,
        httponly=True,
        secure=not is_dev,
        samesite="lax",
        path="/",
        domain=domain,
        max_age=tokens.expires_in,
    )
    response.set_cookie(
        key="rockilus_refresh_token",
        value=tokens.refresh_token,
        httponly=True,
        secure=not is_dev,
        samesite="lax",
        path="/auth",
        domain=domain,
        max_age=config.refresh_cookie_max_age,
    )


def _clear_auth_cookies(response: Response) -> None:
    is_dev = config.environment == "development"
    domain = None if is_dev else _cookie_domain()
    for key in ("rockilus_access_token", "rockilus_refresh_token"):
        response.delete_cookie(
            key=key,
            path="/",
            httponly=True,
            secure=not is_dev,
            samesite="lax",
            domain=domain,
        )


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------


@router.post("/signup")
async def sign_up(
    request: SignUpRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if request.password != request.confirm_password:
            raise PasswordsDoNotMatchError("Passwords do not match")
        await auth_service.sign_up(request)
        log_info(f"Sign-up initiated for: {request.email}")
        return {"message": "User registered. Please check your email for the verification code."}
    except Exception as e:
        log_info("Failed to sign up")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/confirm-signup
# ---------------------------------------------------------------------------


@router.post("/confirm-signup")
async def confirm_sign_up(
    request: ConfirmCodeRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.confirm_sign_up(request)
        log_info(f"Sign-up confirmed for: {request.email}")
        return {"message": "Email verified successfully. You can now sign in."}
    except Exception as e:
        log_info("Failed to confirm sign-up")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/signin
# ---------------------------------------------------------------------------


@router.post("/signin")
async def sign_in(
    response: Response,
    request: SignInRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        tokens = await auth_service.sign_in(request)
        _set_auth_cookies(response, tokens)
        log_info(f"Sign-in successful for: {request.email}")
        return {"message": "Signed in successfully"}
    except Exception as e:
        log_info("Sign-in failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------


@router.post("/refresh")
async def refresh_tokens(
    response: Response,
    rockilus_refresh_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if not rockilus_refresh_token:
            raise HTTPException(status_code=401, detail="No refresh token")
        tokens = await auth_service.refresh(rockilus_refresh_token)
        _set_auth_cookies(response, tokens)
        log_info("Token refresh successful")
        return {"message": "Tokens refreshed"}
    except HTTPException:
        raise
    except Exception as e:
        log_info("Token refresh failed")
        _clear_auth_cookies(response)
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/signout
# ---------------------------------------------------------------------------


@router.post("/signout")
async def sign_out(
    response: Response,
    rockilus_access_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if rockilus_access_token:
            try:
                await auth_service.sign_out(rockilus_access_token)
            except Exception:
                pass
        _clear_auth_cookies(response)
        log_info("Sign-out successful")
        return {"message": "Signed out successfully"}
    except Exception as e:
        log_info("Sign-out failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.forgot_password(request)
        log_info(f"Forgot password requested for: {request.email}")
    except Exception:
        log_info(f"Forgot password failed for: {request.email}")
    # Always return success to prevent user enumeration
    return {"message": "If the email exists, a reset code has been sent."}


# ---------------------------------------------------------------------------
# POST /auth/confirm-forgot-password
# ---------------------------------------------------------------------------


@router.post("/confirm-forgot-password")
async def confirm_forgot_password(
    request: ConfirmForgotPasswordRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.confirm_forgot_password(request)
        log_info(f"Password reset completed for: {request.email}")
        return {"message": "Password has been reset. You can now sign in."}
    except Exception as e:
        log_info("Confirm forgot password failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/change-email
# ---------------------------------------------------------------------------


@router.post("/change-email")
async def change_email(
    response: Response,
    request: ChangeEmailRequestDTO,
    rockilus_access_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if not rockilus_access_token:
            raise HTTPException(status_code=401, detail="Authentication required")
        await auth_service.change_email(rockilus_access_token, request)
        log_info("Change email requested")
        return {"message": "Verification code sent to new email address."}
    except HTTPException:
        raise
    except Exception as e:
        log_info("Change email failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/verify-email
# ---------------------------------------------------------------------------


@router.post("/verify-email")
async def verify_email(
    response: Response,
    request: VerifyEmailRequestDTO,
    rockilus_access_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if not rockilus_access_token:
            raise HTTPException(status_code=401, detail="Authentication required")
        await auth_service.verify_email(rockilus_access_token, request)
        log_info("Email verification successful")
        return {"message": "Email verified successfully."}
    except HTTPException:
        raise
    except Exception as e:
        log_info("Email verification failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/resend-code
# ---------------------------------------------------------------------------


@router.post("/resend-code")
async def resend_confirmation_code(
    request: ResendCodeRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.resend_code(request)
        log_info(f"Confirmation code resent to: {request.email}")
        return {"message": "Verification code resent."}
    except Exception as e:
        log_info("Resend code failed")
        handle_routes_errors(e)
