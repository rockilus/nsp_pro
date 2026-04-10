from typing import NoReturn

from fastapi import HTTPException
from shared.schemas.errors import SchemaTypeError, SchemaValueError

from src.errors.authn_errors.authn_errors import (
    AuthnPasswordPolicyViolationError,
    AuthnWrongCredentialsError,
)
from src.errors.authz_errors.authz_errors import (
    AuthzApiErrorError,
    AuthzConnectionError,
    AuthzContextError,
    AuthzKeyMissingKeyError,
)
from src.errors.message_errors.message_errors import (
    MessageTypeError,
    MessageValidationError,
    MessageValueError,
)
from src.errors.routes_errors.routes_errors import NotAuthorizedError
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
    if isinstance(error, SchemaValueError):
        raise HTTPException(
            status_code=422,
            detail="invalid input value, please check your data",
        )
    if isinstance(error, AuthnWrongCredentialsError):
        raise HTTPException(
            status_code=403, detail="incorrect password, please try again"
        )
    if isinstance(error, AuthnPasswordPolicyViolationError):
        raise HTTPException(
            status_code=400,
            detail=error.message,
        )
    if isinstance(error, NoCampaignError):
        raise HTTPException(status_code=404, detail="No campaign schedule found")
    if isinstance(
        error,
        (
            AuthzConnectionError,
            AuthzApiErrorError,
            AuthzContextError,
            AuthzKeyMissingKeyError,
            MessageTypeError,
            MessageValueError,
            MessageValidationError,
        ),
    ):
        raise HTTPException(status_code=503, detail=USER_ERROR_MESSAGE_GENERIC)

    raise HTTPException(status_code=503, detail=USER_ERROR_MESSAGE_GENERIC)
