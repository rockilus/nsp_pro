import os
from typing import Tuple
from urllib.parse import quote

import boto3  # type: ignore


def get_env_variable(name: str, default_value: str | None = None) -> str:
    value = os.getenv(name)
    if value is None:
        if default_value is not None:
            return default_value
        raise ValueError(f"Environment variable {name} is not set")
    return value


# Environment
ENVIRONMENT: str = get_env_variable("ENVIRONMENT", "development")

# API
API_DOMAIN: str = get_env_variable("API_DOMAIN")
API_URL: str = get_env_variable("API_URL")
API_PORT: int = int(get_env_variable("API_PORT"))
ORIGINS: Tuple[str, ...] = tuple(get_env_variable("ORIGINS").split(","))

# Client
CLIENT_URL: str = get_env_variable("CLIENT_URL")

# AWS
if ENVIRONMENT == "production":
    session = boto3.Session()
    credentials = session.get_credentials()
    if credentials:
        access_key_id = quote(credentials.access_key, safe="")
        secret_access_key = quote(credentials.secret_key, safe="")
        session_token = quote(credentials.token, safe="")
    else:
        print(
            "Failed to retrieve AWS credentials. Make sure your code is "
            + "running in an ECS container."
        )

# Database
DB_URI: str
if ENVIRONMENT == "development":
    DB_URI = get_env_variable("DB_URI")
elif ENVIRONMENT == "production":
    DB_URI = (
        f"mongodb+srv://{access_key_id}:{secret_access_key}"
        + "@nsp-pro-db-cluster.dniww7t.mongodb.net/"
        + "?authSource=%24external"
        + "&authMechanism=MONGODB-AWS"
        + "&retryWrites=true"
        + "&w=majority"
        + "&authMechanismProperties=AWS_SESSION_TOKEN:{session_token}"
        + "&appName=nsp-pro-db-cluster"
    )

# Supertokens config
ST_CONNECTION_URI: str = get_env_variable("ST_CONNECTION_URI")
ST_API_KEY: str = get_env_variable("ST_API_KEY")
ST_DASHBOARD_ADMINS: Tuple[str, ...] = tuple(
    get_env_variable("ST_DASHBOARD_ADMINS").split(",")
)
# Permit.io config
PDP_URL: str = get_env_variable("PDP_URL")
PDP_API_KEY: str = get_env_variable("PDP_API_KEY")

# Uvicorn config
UVICORN_RELOAD: bool = bool(get_env_variable("UVICORN_RELOAD"))
