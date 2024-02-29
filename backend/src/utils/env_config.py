import os
from typing import Tuple


def get_env_variable(name: str) -> str:
    value = os.getenv(name)
    if value is None:
        raise ValueError(f"Environment variable {name} is not set")
    return value


ST_CONNECTION_URI: str = get_env_variable("ST_CONNECTION_URI")
ST_API_KEY: str = get_env_variable("ST_API_KEY")
ST_DASHBOARD_ADMINS: Tuple[str, ...] = tuple(
    get_env_variable("ST_DASHBOARD_ADMINS").split(",")
)
# Permit.io config
PDP_URL: str = get_env_variable("PDP_URL")
PERMIT_API_KEY: str = get_env_variable("PERMIT_API_KEY")
