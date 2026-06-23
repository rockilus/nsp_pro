"""Rate limiter singleton — shared across the FastAPI app and route decorators.

Uses in-memory storage by default. For multi-instance ECS production deployments,
switch to a Redis backend:

    from slowapi.storage.redis import RedisStorage
    limiter = Limiter(key_func=..., storage_uri="redis://...")
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],
)
