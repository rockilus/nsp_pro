from fastapi import HTTPException

from errors.authorization_service_errors.authz_errors import (
    AuthzApiErrorError,
    AuthzConnectionError,
    AuthzContextError,
    AuthzKeyMissingKeyError,
)
from utils.constants import Constants


def handle_authz_errors(error: Exception):
    if isinstance(
        error,
        (
            AuthzConnectionError,
            AuthzApiErrorError,
            AuthzContextError,
            AuthzKeyMissingKeyError,
        ),
    ):
        raise HTTPException(
            status_code=503, detail=Constants.USER_ERROR_MESSAGE_GENERIC
        )
    raise HTTPException(status_code=503, detail=Constants.USER_ERROR_MESSAGE_GENERIC)
