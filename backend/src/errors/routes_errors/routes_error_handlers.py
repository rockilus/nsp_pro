from fastapi import HTTPException

from errors.authz_errors.authz_errors import (
    AuthzApiErrorError,
    AuthzConnectionError,
    AuthzContextError,
    AuthzKeyMissingKeyError,
)
from errors.core_errors.core_errors import CoreTypeError, CoreValueError
from errors.database_errors.db_connection_error import DBConnectionError
from errors.database_errors.document_errors import (
    DocumentDoesNotExistError,
    DocumentHasExtraFieldError,
    DocumentMultipleFoundError,
    DocumentNotUniqueError,
)
from errors.message_errors.message_errors import (
    MessageTypeError,
    MessageValidationError,
    MessageValueError,
)
from errors.routes_errors.routes_errors import NotAuthorizedError
from utils.constants import Constants


def handle_routes_errors(error: Exception):
    if isinstance(error, CoreTypeError):
        raise HTTPException(
            status_code=400,
            detail="invalid input type, please check your data",
        )
    if isinstance(error, NotAuthorizedError):
        raise HTTPException(
            status_code=403,
            detail=error.message,
        )
    if isinstance(error, DocumentDoesNotExistError):
        raise HTTPException(
            status_code=404, detail="the requested resource could not be found"
        )
    if isinstance(error, DocumentNotUniqueError):
        raise HTTPException(
            status_code=409,
            detail="the provided value already exists, please use a different value",
        )
    if isinstance(error, CoreValueError):
        raise HTTPException(
            status_code=422,
            detail="invalid input value, please check your data",
        )
    if isinstance(
        error,
        (
            AuthzConnectionError,
            AuthzApiErrorError,
            AuthzContextError,
            AuthzKeyMissingKeyError,
            DBConnectionError,
            DocumentHasExtraFieldError,
            DocumentMultipleFoundError,
            MessageTypeError,
            MessageValueError,
            MessageValidationError,
        ),
    ):
        raise HTTPException(
            status_code=503, detail=Constants.USER_ERROR_MESSAGE_GENERIC
        )

    raise HTTPException(status_code=503, detail=Constants.USER_ERROR_MESSAGE_GENERIC)
