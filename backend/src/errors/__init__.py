from errors.authn_errors.authn_error_handlers import handle_supertokens_errors
from errors.authz_errors.authz_error_handlers import handle_permit_errors
from errors.authz_errors.authz_errors import AuthzConnectionError
from errors.core_errors.core_error_handlers import handle_create_core_object_error
from errors.database_errors.db_connection_error import DBConnectionError
from errors.database_errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from errors.message_errors.message_error_handlers import handle_message_errors
from errors.message_errors.message_errors import MessageTypeError
from errors.no_key_provided_error import NoKeyProvidedError
from errors.no_solution_error import NoSolutionError
from errors.routes_errors.routes_error_handlers import handle_routes_errors
from errors.worker_name_not_allowed_error import WorkerNameNotAllowed

__all__ = [
    "handle_supertokens_errors",
    "handle_permit_errors",
    "AuthzConnectionError",
    "handle_create_core_object_error",
    "DBConnectionError",
    "handle_create_document_error",
    "handle_delete_document_error",
    "handle_get_document_error",
    "handle_save_document_error",
    "handle_message_errors",
    "MessageTypeError",
    "NoKeyProvidedError",
    "NoSolutionError",
    "handle_routes_errors",
    "WorkerNameNotAllowed",
]
