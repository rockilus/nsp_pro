from supertokens_python.exceptions import GeneralError

from errors.authn_errors.authn_errors import AuthnGeneralError


def handle_supertokens_errors(error: Exception):
    if isinstance(error, GeneralError):
        raise AuthnGeneralError(str(error)) from error
    raise error
