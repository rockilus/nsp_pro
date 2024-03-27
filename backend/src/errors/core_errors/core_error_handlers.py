from errors.core_errors.core_errors import CoreTypeError, CoreValueError


def handle_create_core_object_error(error: Exception):
    if isinstance(error, TypeError):
        raise CoreTypeError(str(error)) from error
    if isinstance(error, ValueError):
        raise CoreValueError(str(error)) from error
    raise error
