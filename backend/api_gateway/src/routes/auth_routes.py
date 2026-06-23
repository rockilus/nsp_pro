"""Auth routes — cookie-based custom auth UI backend.

All endpoints are unauthenticated (no get_user_context dependency).
Tokens flow via HttpOnly cookies, never in response bodies.
"""

from typing import Dict

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
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
from src.dependencies.user_service import get_user_service
from src.errors import (
    AuthnEmailAlreadyExistsError,
    PasswordsDoNotMatchError,
    handle_routes_errors,
)
from src.integrations.authentication.cognito_auth_client import AuthTokens
from src.rate_limiter import limiter
from src.services.auth_service import AuthService
from src.services.user_service import UserService

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
        path="/",
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
@limiter.limit(lambda: config.signup_rate_limit)
async def sign_up(
    request: Request,
    body: SignUpRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
    user_service: UserService = Depends(get_user_service),
) -> Dict:
    try:
        if body.password != body.confirm_password:
            raise PasswordsDoNotMatchError("Passwords do not match")
        try:
            user_sub = await auth_service.sign_up(body)
        except AuthnEmailAlreadyExistsError:
            tokens = await auth_service.sign_in(
                SignInRequestDTO(email=body.email, password=body.password)
            )
            user_sub = auth_service.decode_token_sub(tokens.access_token)
            log_info(f"User {body.email} already exists in Cognito, onboarding to DB")
        await user_service.create_user(
            user_id=user_sub,
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
        )
        log_info(f"Sign-up and onboard completed for: {body.email}")
        return {
            "message": "User registered. Please check your email for the verification code.",
            "user_sub": user_sub,
        }
    except Exception as e:
        log_info("Failed to sign up")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/confirm-signup
# ---------------------------------------------------------------------------


@router.post("/confirm-signup")
@limiter.limit(lambda: config.confirm_signup_rate_limit)
async def confirm_sign_up(
    request: Request,
    body: ConfirmCodeRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.confirm_sign_up(body)
        log_info(f"Sign-up confirmed for: {body.email}")
        return {"message": "Email verified successfully. You can now sign in."}
    except Exception as e:
        log_info("Failed to confirm sign-up")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/signin
# ---------------------------------------------------------------------------


@router.post("/signin")
@limiter.limit(lambda: config.signin_rate_limit)
async def sign_in(
    request: Request,
    response: Response,
    body: SignInRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        tokens = await auth_service.sign_in(body)
        _set_auth_cookies(response, tokens)
        log_info(f"Sign-in successful for: {body.email}")
        return {
            "message": "Signed in successfully",
            "user_sub": auth_service.decode_token_sub(tokens.access_token),
        }
    except Exception as e:
        log_info("Sign-in failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/refresh
# ---------------------------------------------------------------------------


@router.post("/refresh")
@limiter.limit(lambda: config.refresh_rate_limit)
async def refresh_tokens(
    request: Request,
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
@limiter.limit(lambda: config.signout_rate_limit)
async def sign_out(
    request: Request,
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
@limiter.limit(lambda: config.forgot_password_rate_limit)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.forgot_password(body)
        log_info(f"Forgot password requested for: {body.email}")
    except Exception:
        log_info(f"Forgot password failed for: {body.email}")
    # Always return success to prevent user enumeration
    return {"message": "If the email exists, a reset code has been sent."}


# ---------------------------------------------------------------------------
# POST /auth/confirm-forgot-password
# ---------------------------------------------------------------------------


@router.post("/confirm-forgot-password")
@limiter.limit(lambda: config.confirm_forgot_password_rate_limit)
async def confirm_forgot_password(
    request: Request,
    body: ConfirmForgotPasswordRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.confirm_forgot_password(body)
        log_info(f"Password reset completed for: {body.email}")
        return {"message": "Password has been reset. You can now sign in."}
    except Exception as e:
        log_info("Confirm forgot password failed")
        handle_routes_errors(e)


# ---------------------------------------------------------------------------
# POST /auth/change-email
# ---------------------------------------------------------------------------


@router.post("/change-email")
@limiter.limit(lambda: config.change_email_rate_limit)
async def change_email(
    request: Request,
    response: Response,
    body: ChangeEmailRequestDTO,
    rockilus_access_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if not rockilus_access_token:
            raise HTTPException(status_code=401, detail="Authentication required")
        await auth_service.change_email(rockilus_access_token, body)
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
@limiter.limit(lambda: config.verify_email_rate_limit)
async def verify_email(
    request: Request,
    response: Response,
    body: VerifyEmailRequestDTO,
    rockilus_access_token: str | None = Cookie(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        if not rockilus_access_token:
            raise HTTPException(status_code=401, detail="Authentication required")
        await auth_service.verify_email(rockilus_access_token, body)
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
@limiter.limit(lambda: config.resend_code_rate_limit)
async def resend_confirmation_code(
    request: Request,
    body: ResendCodeRequestDTO,
    auth_service: AuthService = Depends(get_auth_service),
) -> Dict:
    try:
        await auth_service.resend_code(body)
        log_info(f"Confirmation code resent to: {body.email}")
        return {"message": "Verification code resent."}
    except Exception as e:
        log_info("Resend code failed")
        handle_routes_errors(e)
