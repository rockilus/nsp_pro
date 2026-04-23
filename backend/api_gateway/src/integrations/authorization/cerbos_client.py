from cerbos.sdk.grpc.client import AsyncCerbosClient  # type: ignore[import]
from shared.logger import log_info

from src.config import config

_instances: dict[str, AsyncCerbosClient] = {}


def get_cerbos_client() -> AsyncCerbosClient:
    if "default" not in _instances:
        _instances["default"] = AsyncCerbosClient(
            host=config.cerbos_host, tls_verify=False
        )
    return _instances["default"]


async def cerbos_health_check() -> None:
    """Verify connectivity to the Cerbos PDP by fetching server info."""
    client = get_cerbos_client()
    try:
        await client.server_info()
    except Exception as e:
        log_info(f"Cerbos health check failed: {e}")
        raise
