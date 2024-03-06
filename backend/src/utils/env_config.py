import os
from typing import Tuple


def get_env_variable(name: str) -> str:
    value = os.getenv(name)
    if value is None:
        raise ValueError(f"Environment variable {name} is not set")
    return value


# API
API_DOMAIN: str = get_env_variable("API_DOMAIN")
API_URL: str = get_env_variable("API_URL")
API_PORT: int = int(get_env_variable("API_PORT"))
ORIGINS: Tuple[str, ...] = tuple(get_env_variable("ORIGINS").split(","))

# CLIENT
CLIENT_URL: str = get_env_variable("CLIENT_URL")
CLIENT_PORT: int = int(get_env_variable("CLIENT_PORT"))

# Database
DB_URI: str = get_env_variable("DB_URI")

# Supertokens config
ST_CONNECTION_URI: str = get_env_variable("ST_CONNECTION_URI")
ST_API_KEY: str = get_env_variable("ST_API_KEY")
ST_DASHBOARD_ADMINS: Tuple[str, ...] = tuple(
    get_env_variable("ST_DASHBOARD_ADMINS").split(",")
)
# Permit.io config
PDP_URL: str = get_env_variable("PDP_URL")
PERMIT_API_KEY: str = get_env_variable("PERMIT_API_KEY")

# Uvicorn config
UVICORN_RELOAD: bool = bool(get_env_variable("UVICORN_RELOAD"))
