# from errors import AuthzConnectionError
from integrations.authentication.authn_services import authn_connect
from supertokens_python.querier import Querier

from shared.logger import log_info


def authn_health_check() -> None:
    try:
        querier = Querier.get_instance()
        querier.get_api_version()
    except Exception as e:
        log_info("Supertokens health check error, trying to reconnect: " + str(e))
        authn_connect()
