import os
import tempfile

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings


# Step 1: Define your Pydantic Config Class
class AppConfig(BaseSettings):
    redis_url: str = Field(..., description="Redis connection URL")
    result_backend: str = Field(..., description="Redis URL for result backend")
    log_level: str = Field(
        "INFO",
        description="Logging level",
        pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
    )
    api_domain: str = Field(..., description="API domain")
    api_port: int = Field(..., description="API port")
    uvicorn_reload: bool = Field(..., description="Enable Uvicorn auto-reload feature")

    # pylint: disable=too-few-public-methods
    class Config:
        # Set environment variable precedence
        env_prefix: str = ""  # No prefix; can adjust if needed
        env_file: str | None = None  # Set dynamically for development


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

        required_env_vars = [
            "API_DOMAIN",
            "API_PORT",
            "UVICORN_RELOAD",
            "REDIS_URL",
            "RESULT_BACKEND",
            "LOG_LEVEL",
        ]
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]

        if missing_vars:
            print(f"Missing required environment variables: {missing_vars}")
            # Retrieve .env file from S3
            bucket_name = "nsp-pro-bucket"
            file_key = ".data_fetcher.env"  # Replace with the key of your .env file
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
