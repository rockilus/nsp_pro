# from src.errors import AuthzConnectionError
from shared.logger import log_info
from supertokens_python.querier import Querier

from src.integrations.authentication.authn_services import authn_connect


async def authn_health_check() -> None:
    try:
        querier = Querier.get_instance()
        await querier.get_api_version()
    except Exception as e:
        log_info("Supertokens health check error, trying to reconnect: " + str(e))
        authn_connect()
