from cerbos.sdk.grpc.client import AsyncCerbosClient  # type: ignore[import]

from src.config import config

_instances: dict[str, AsyncCerbosClient] = {}


def get_cerbos_client() -> AsyncCerbosClient:
    if "default" not in _instances:
        _instances["default"] = AsyncCerbosClient(
            host=config.cerbos_host, tls_verify=False
        )
    return _instances["default"]
