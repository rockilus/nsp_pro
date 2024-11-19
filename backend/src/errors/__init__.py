from errors.authn_errors.authn_error_handlers import handle_supertokens_errors
from errors.authn_errors.authn_errors import (
    AuthnEmailAlreadyExistsError,
    AuthnPasswordChangeError,
    AuthnPasswordPolicyViolationError,
    AuthnUpdateEmailError,
    AuthnUserNotFoundError,
    AuthnWrongCredentialsError,
)
from errors.authz_errors.authz_error_handlers import handle_permit_errors
from errors.authz_errors.authz_errors import AuthzConnectionError
from errors.core_errors.core_error_handlers import handle_create_core_object_error
from errors.core_errors.core_errors import UserNotFoundError
from errors.database_errors.db_connection_error import DBConnectionError
from errors.database_errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from errors.database_errors.document_errors import DocumentDoesNotExistError
from errors.message_errors.message_error_handlers import handle_message_errors
from errors.message_errors.message_errors import MessageTypeError
from errors.routes_errors.routes_error_handlers import handle_routes_errors
from errors.routes_errors.routes_errors import (
    NotAuthorizedError,
    PasswordsDoNotMatchError,
)
from errors.stats_errors.stats_errors import NoCampaignError

__all__ = [
    "handle_supertokens_errors",
    "AuthnEmailAlreadyExistsError",
    "AuthnPasswordChangeError",
    "AuthnPasswordPolicyViolationError",
    "AuthnUserNotFoundError",
    "AuthnWrongCredentialsError",
    "AuthnUpdateEmailError",
    "handle_permit_errors",
    "AuthzConnectionError",
    "handle_create_core_object_error",
    "UserNotFoundError",
    "DBConnectionError",
    "handle_create_document_error",
    "handle_delete_document_error",
    "handle_get_document_error",
    "handle_save_document_error",
    "DocumentDoesNotExistError",
    "handle_message_errors",
    "MessageTypeError",
    "handle_routes_errors",
    "NotAuthorizedError",
    "PasswordsDoNotMatchError",
    "NoCampaignError",
]
