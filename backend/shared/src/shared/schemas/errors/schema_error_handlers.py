from shared.schemas.errors.schema_errors import SchemaTypeError, SchemaValueError


def handle_create_schema_object_error(error: Exception):
    if isinstance(error, TypeError):
        raise SchemaTypeError(str(error)) from error
    if isinstance(error, ValueError):
        raise SchemaValueError(str(error)) from error
    raise error
