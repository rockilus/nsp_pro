from permit import PermitConnectionError  # type: ignore
from permit import PermitApiError, PermitContextError

from errors.authorization_service_errors.authz_errors import (
    AuthzApiErrorError,
    AuthzConnectionError,
    AuthzContextError,
    AuthzKeyMissingKeyError,
)


def handle_authz_errors(error: Exception):
    if isinstance(error, PermitConnectionError):
        raise AuthzConnectionError(str(error)) from error
    if isinstance(error, KeyError):
        raise AuthzKeyMissingKeyError(str(error)) from error
    if isinstance(error, PermitApiError):
        raise AuthzApiErrorError(str(error)) from error
    if isinstance(error, PermitContextError):
        raise AuthzContextError(str(error)) from error
    raise error
