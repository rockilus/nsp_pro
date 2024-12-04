from mongoengine.connection import ConnectionFailure
from mongoengine.errors import (
    DoesNotExist,
    FieldDoesNotExist,
    MultipleObjectsReturned,
    NotUniqueError,
    ValidationError,
)

from shared.database.errors.db_connection_error import DBConnectionError
from shared.database.errors.document_errors import (
    DocumentDoesNotExistError,
    DocumentHasExtraFieldError,
    DocumentMultipleFoundError,
    DocumentNotUniqueError,
    DocumentValidationError,
)


def handle_create_document_error(error: Exception):
    if isinstance(error, ValidationError):
        raise DocumentValidationError(str(error)) from error
    raise error


def handle_save_document_error(error: Exception):
    if isinstance(error, ConnectionFailure):
        raise DBConnectionError(str(error)) from error
    if isinstance(error, NotUniqueError):
        raise DocumentNotUniqueError(str(error)) from error
    if isinstance(error, FieldDoesNotExist):
        raise DocumentHasExtraFieldError(str(error)) from error
    raise error


def handle_get_document_error(error: Exception):
    if isinstance(error, ConnectionFailure):
        raise DBConnectionError(str(error)) from error
    if isinstance(error, DoesNotExist):
        raise DocumentDoesNotExistError(str(error)) from error
    if isinstance(error, MultipleObjectsReturned):
        raise DocumentMultipleFoundError(str(error)) from error
    raise error


def handle_delete_document_error(error: Exception):
    if isinstance(error, ConnectionFailure):
        raise DBConnectionError(str(error)) from error
    if isinstance(error, DoesNotExist):
        raise DocumentDoesNotExistError(str(error)) from error
    raise error
