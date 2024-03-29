from pydantic_core import ValidationError

from errors.message_errors.message_errors import (
    MessageTypeError,
    MessageValidationError,
    MessageValueError,
)


def handle_message_errors(e: Exception):
    if isinstance(e, TypeError):
        raise MessageTypeError(str(e)) from e
    if isinstance(e, ValueError):
        raise MessageValueError(str(e)) from e
    if isinstance(e, ValidationError):
        raise MessageValidationError(str(e)) from e
    raise e
