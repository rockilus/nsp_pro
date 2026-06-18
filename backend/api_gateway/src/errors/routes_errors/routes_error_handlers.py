from typing import NoReturn

from fastapi import HTTPException
from shared.schemas.errors import SchemaTypeError, SchemaValueError

from src.errors.authn_errors.authn_errors import (
    AuthnConnectionError,
    AuthnEmailAlreadyExistsError,
    AuthnPasswordChangeError,
    AuthnPasswordPolicyViolationError,
    AuthnUpdateEmailError,
    AuthnUserNotConfirmedError,
    AuthnUserNotFoundError,
    AuthnWrongCredentialsError,
    SecurityViolation,
)
from src.errors.message_errors.message_errors import (
    MessageTypeError,
    MessageValidationError,
    MessageValueError,
)
from src.errors.routes_errors.routes_errors import (
    NotAuthorizedError,
    PasswordsDoNotMatchError,
)
from src.errors.stats_errors.stats_errors import NoCampaignError
from src.utils.constants import USER_ERROR_MESSAGE_GENERIC


def handle_routes_errors(error: Exception) -> NoReturn:
    if isinstance(error, HTTPException):
        raise error
    if isinstance(error, SchemaTypeError):
        raise HTTPException(
            status_code=400,
            detail="invalid input type, please check your data",
        )
    if isinstance(error, NotAuthorizedError):
        raise HTTPException(
            status_code=403,
            detail=error.message,
        )
    if isinstance(error, PasswordsDoNotMatchError):
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    if isinstance(error, SchemaValueError):
        raise HTTPException(
            status_code=422,
            detail="invalid input value, please check your data",
        )
    if isinstance(error, AuthnWrongCredentialsError):
        raise HTTPException(
            status_code=401, detail=error.message or "Incorrect credentials"
        )
    if isinstance(error, AuthnUserNotFoundError):
        raise HTTPException(
            status_code=401, detail=error.message or "Invalid credentials"
        )
    if isinstance(error, AuthnUserNotConfirmedError):
        raise HTTPException(
            status_code=403,
            detail={
                "error_code": "USER_NOT_CONFIRMED",
                "message": error.message
                or "Account not confirmed. Please check your email.",
            },
        )
    if isinstance(error, AuthnEmailAlreadyExistsError):
        raise HTTPException(
            status_code=409, detail=error.message or "Email already registered"
        )
    if isinstance(error, AuthnPasswordPolicyViolationError):
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    if isinstance(error, AuthnPasswordChangeError):
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    if isinstance(error, AuthnUpdateEmailError):
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    if isinstance(error, SecurityViolation):
        raise HTTPException(status_code=500, detail="Internal security violation")
    if isinstance(error, AuthnConnectionError):
        raise HTTPException(status_code=503, detail=USER_ERROR_MESSAGE_GENERIC)
    if isinstance(error, NoCampaignError):
        raise HTTPException(status_code=404, detail="No campaign schedule found")
    if isinstance(
        error,
        (
            MessageTypeError,
            MessageValueError,
            MessageValidationError,
        ),
    ):
        raise HTTPException(status_code=503, detail=USER_ERROR_MESSAGE_GENERIC)

    raise HTTPException(status_code=503, detail=USER_ERROR_MESSAGE_GENERIC)
