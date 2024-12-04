from shared.database.errors.db_connection_error import DBConnectionError
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.errors.document_errors import (
    DocumentDoesNotExistError,
    DocumentHasExtraFieldError,
    DocumentMultipleFoundError,
    DocumentNotUniqueError,
)

__all__ = [
    "DBConnectionError",
    "handle_create_document_error",
    "handle_delete_document_error",
    "handle_get_document_error",
    "handle_save_document_error",
    "DocumentDoesNotExistError",
    "DocumentHasExtraFieldError",
    "DocumentMultipleFoundError",
    "DocumentNotUniqueError",
]
