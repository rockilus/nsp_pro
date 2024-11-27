from supertokens_python.querier import Querier

from errors import AuthzConnectionError
from logger import log_info


def authn_health_check() -> None:
    try:
        querier = Querier.get_instance()
        querier.get_api_version()
    except Exception as e:
        log_info("Supertokens connection error")
        raise AuthzConnectionError(
            "Failed to connect to Supertokens authentication service"
        ) from e
