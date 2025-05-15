import os
import tempfile
from urllib.parse import quote

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings


# Step 1: Define your Pydantic Config Class
class AppConfig(BaseSettings):
    environment: str = Field(
        "development", description="Environment (development or production)"
    )
    api_domain: str = Field(..., description="API domain")
    api_url: str = Field(..., description="API URL")
    api_port: int = Field(..., description="API port")
    origins: list[str] = Field(..., description="Allowed origins for CORS")
    client_url: str = Field(..., description="Client URL")
    db_uri: str = Field(..., description="Database connection URL")
    st_connection_uri: str = Field(..., description="Supertokens connection URI")
    st_api_key: str = Field(..., description="Supertokens API key")
    st_dashboard_admins: list[str] = Field(
        ..., description="SuperTokens dashboard admins"
    )
    st_cookie_domain: str = Field(..., description="SuperTokens cookie domain")
    pdp_url: str = Field(..., description="Policy Decision Point URL")
    pdp_api_key: str = Field(..., description="Policy Decision Point API key")
    uvicorn_reload: bool = Field(
        False,
        description="Enable Uvicorn auto-reload",
    )
    redis_url: str = Field(..., description="Redis connection URL")
    result_backend: str = Field(..., description="Redis URL for result backend")
    task_expiration: int = Field(..., description="Task expiration time in seconds")

    # pylint: disable=too-few-public-methods
    class Config:
        # Set environment variable precedence
        env_prefix: str = ""  # No prefix; can adjust if needed
        env_file: str | None = None  # Set dynamically for development


# Step 2: Functions to retrieve variables
def get_secret(secret_name: str, region_name: str = "eu-west-3") -> str:
    try:
        client = boto3.client("secretsmanager", region_name=region_name)
        response = client.get_secret_value(SecretId=secret_name)
        secret = response["SecretString"]
        return secret
    except (BotoCoreError, ClientError) as error:
        print(f"Error retrieving secret {secret_name}: {error}")
        raise error


def download_env_file_from_s3(
    bucket_name: str, file_key: str, region_name: str = "eu-west-3"
) -> str:
    try:
        s3_client = boto3.client("s3", region_name=region_name)

        # Temporary file to store the downloaded .env
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            s3_client.download_file(bucket_name, file_key, temp_file.name)
            temp_file_path = temp_file.name

        # Return the path to the temporary file for Pydantic to use
        return temp_file_path
    except (BotoCoreError, ClientError) as error:
        print(f"Error downloading or loading .env file from S3: {error}")
        raise error


# Step 3: Main function to initialize config
# pylint: disable=too-many-locals
def initialize_environment() -> AppConfig:
    # Determine environment (development or production)
    environment = os.getenv(
        "ENVIRONMENT", "development"
    ).lower()  # Default to development

    if environment == "production":
        print("Running in production mode.")

        region = "eu-west-3"

        if not os.getenv("DB_URI"):
            print("DB_URI not set; retrieving it from Secrets Manager.")
            # Retrieve secret from Secrets Manager
            secret_name = "DB_URI"
            secret = get_secret(secret_name, region_name=region)
            if secret:
                os.environ["SECRET_VALUE"] = secret  # Store in environment variables

        # Fetch AWS credentials
        session = boto3.Session()
        credentials = session.get_credentials()
        if credentials:
            access_key_id = quote(credentials.access_key, safe="")
            secret_access_key = quote(credentials.secret_key, safe="")
            session_token = quote(credentials.token, safe="")

            # Replace placeholders in the DB_URI with actual AWS credentials
            db_uri_template = os.getenv("DB_URI")
            if not db_uri_template:
                raise ValueError("DB_URI template not found in environment variables.")
            db_uri = (
                db_uri_template.replace("<AWS access key>", access_key_id)
                .replace("<AWS secret key>", secret_access_key)
                .replace("<session token (for AWS IAM Roles)>", session_token)
            )
            os.environ["DB_URI"] = db_uri

        required_env_vars = [
            "API_DOMAIN",
            "API_URL",
            "API_PORT",
            "ORIGINS",
            "CLIENT_URL",
            "ST_CONNECTION_URI",
            "ST_API_KEY",
            "ST_DASHBOARD_ADMINS",
            "ST_COOKIE_DOMAIN",
            "PDP_URL",
            "PDP_API_KEY",
            "UVICORN_RELOAD",
            "REDIS_URL",
            "RESULT_BACKEND",
            "TASK_EXPIRATION",
        ]
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]

        if missing_vars:
            print(f"Missing required environment variables: {missing_vars}")
            # Retrieve .env file from S3
            bucket_name = "nsp-pro-bucket"
            file_key = ".env"  # Replace with the key of your .env file
            env_file_path = download_env_file_from_s3(
                bucket_name, file_key, region_name=region
            )
            if env_file_path is not None:
                # Tell Pydantic to use the .env file
                AppConfig.Config.env_file = env_file_path
    else:
        print("Running in development mode.")
        # Load local .env file
        local_env_file = os.path.join(os.path.dirname(__file__), ".env.development")
        load_dotenv(local_env_file)
        AppConfig.Config.env_file = local_env_file

    # Load config
    try:
        out = AppConfig()  # type: ignore
        print(f"Configuration loaded: {out}")
        return out
    except ValidationError as e:
        print("Configuration validation failed:", e)
        raise


config = initialize_environment()
