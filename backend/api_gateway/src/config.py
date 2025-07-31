import os
import tempfile
from urllib.parse import quote

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict


# Step 1: Define your Pydantic Config Class
class AppConfig(BaseSettings):
    environment: str = Field(
        "production", description="Environment (development or production)"
    )
    api_domain: str = Field(..., description="API domain")
    api_url: str = Field(..., description="API URL")
    api_port: int = Field(..., description="API port")
    origins: list[str] = Field(..., description="Allowed origins for CORS")
    client_url: str = Field(..., description="Client URL")
    db_uri: str = Field(..., description="Database connection URL")

    # DocumentDB configuration
    use_documentdb: bool = Field(
        False, description="Whether to use DocumentDB instead of MongoDB"
    )
    documentdb_secret_name: str = Field(
        "", description="AWS Secrets Manager secret name for DocumentDB"
    )
    documentdb_database_name: str = Field(
        "nsp_pro", description="DocumentDB database name"
    )
    documentdb_ca_bundle_path: str = Field(
        "/app/global-bundle.pem",
        description="Path to DocumentDB CA bundle certificate",
    )

    st_connection_uri: str = Field(
        ..., description="Supertokens connection URI"
    )
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
    task_expiration: int = Field(
        ..., description="Task expiration time in seconds"
    )
    aws_region: str = Field(
        "eu-west-3",
        description="AWS region for services like SQS and Secrets Manager",
    )
    aws_access_key_id: str = Field(
        ..., description="AWS access key ID for authentication"
    )
    aws_secret_access_key: str = Field(
        ..., description="AWS secret access key for authentication"
    )
    aws_session_token: str | None = Field(
        None,
        description="AWS session token for temporary credentials (optional)",
    )
    endpoint_url: str | None = Field(
        None,
        description="Endpoint URL for local AWS services (None for prod)",
    )

    # Development authentication fields
    dev_user_id: str = Field(
        "dev-user-123",
        description="Development user ID for local authentication",
    )
    dev_user_email: str = Field(
        "dev@nsp-pro.com",
        description="Development user email for local authentication",
    )
    dev_api_key: str = Field(
        "dev-service-key-12345",
        description="Development API key for service authentication",
    )

    model_config = SettingsConfigDict(
        env_prefix="",  # No prefix; can adjust if needed
        env_file=os.path.join(
            os.path.dirname(__file__), "..", ".env.development"
        ),
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields from env
    )


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


def get_documentdb_credentials(
    secret_name: str, region_name: str = "eu-west-3"
) -> dict[str, str]:
    """Retrieve DocumentDB credentials from AWS Secrets Manager."""
    import json

    try:
        client = boto3.client("secretsmanager", region_name=region_name)
        response = client.get_secret_value(SecretId=secret_name)
        secret_string = response["SecretString"]
        credentials = json.loads(secret_string)
        return credentials
    except (BotoCoreError, ClientError) as error:
        print(
            f"Error retrieving DocumentDB credentials from "
            f"{secret_name}: {error}"
        )
        raise error


def download_documentdb_ca_bundle(
    ca_bundle_path: str = "/app/global-bundle.pem",
) -> None:
    """Download DocumentDB CA bundle certificate."""
    import urllib.request

    # Skip download if file already exists
    if os.path.exists(ca_bundle_path):
        print(f"DocumentDB CA bundle already exists at {ca_bundle_path}")
        return

    # For development, use a different path that we can write to
    if not os.path.exists(os.path.dirname(ca_bundle_path)):
        if ca_bundle_path.startswith("/app"):
            # In development, use a writable path
            ca_bundle_path = os.path.join(
                os.path.dirname(__file__), "..", "global-bundle.pem"
            )
            ca_bundle_path = os.path.abspath(ca_bundle_path)

    ca_bundle_url = (
        "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
    )

    try:
        # Create directory if it doesn't exist and we have permission
        dir_path = os.path.dirname(ca_bundle_path)
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path, exist_ok=True)
            except (OSError, PermissionError):
                print(f"Cannot create directory {dir_path}, using temp")
                import tempfile

                ca_bundle_path = os.path.join(
                    tempfile.gettempdir(), "global-bundle.pem"
                )

        urllib.request.urlretrieve(ca_bundle_url, ca_bundle_path)
        print(f"DocumentDB CA bundle downloaded to {ca_bundle_path}")

        # Update environment variable with actual path
        os.environ["DOCUMENTDB_CA_BUNDLE_PATH"] = ca_bundle_path

    except Exception as e:
        print(f"Error downloading DocumentDB CA bundle: {e}")
        # Don't raise in development, just warn
        if os.getenv("ENVIRONMENT", "production").lower() == "production":
            raise


# Step 3: Main function to initialize config
# pylint: disable=too-many-locals
def initialize_environment() -> AppConfig:
    # Determine environment (development or production)
    environment = os.getenv(
        "ENVIRONMENT", "production"
    ).lower()  # Default to production for security

    if environment == "production":
        print("Running in production mode.")

        region = "eu-west-3"

        # Set DocumentDB configuration for production
        os.environ["USE_DOCUMENTDB"] = "true"
        documentdb_secret = f"nsp-pro/{environment}/documentdb/credentials"
        os.environ["DOCUMENTDB_SECRET_NAME"] = documentdb_secret
        os.environ["DOCUMENTDB_DATABASE_NAME"] = "nsp_pro"

        # Download CA bundle for DocumentDB TLS connection
        download_documentdb_ca_bundle()

        if not os.getenv("DB_URI"):
            print("DB_URI not set; retrieving it from Secrets Manager.")
            print("DB_URI not set; retrieving it from Secrets Manager.")
            # Retrieve secret from Secrets Manager
            secret_name = "DB_URI"
            secret = get_secret(secret_name, region_name=region)
            if secret:
                os.environ["SECRET_VALUE"] = (
                    secret  # Store in environment variables
                )

        # Fetch AWS credentials
        session = boto3.Session()
        credentials = session.get_credentials()
        if credentials:
            aws_access_key_id = credentials.access_key
            aws_secret_access_key = credentials.secret_key
            aws_session_token = credentials.token

            if aws_session_token is None:
                raise ValueError("AWS access key ID is not set.")

            # Set AWS credentials in environment variables for Pydantic
            os.environ["AWS_ACCESS_KEY_ID"] = aws_access_key_id
            os.environ["AWS_SECRET_ACCESS_KEY"] = aws_secret_access_key
            os.environ["AWS_SESSION_TOKEN"] = aws_session_token

            # Set endpoint_url to None for production (use real AWS services)
            # os.environ["ENDPOINT_URL"] = ""  # Empty = None for Pydantic

            print("AWS credentials retrieved and set from boto3 session")

            # Replace placeholders in the DB_URI with actual AWS credentials
            db_uri_template = os.getenv("DB_URI")
            if not db_uri_template:
                raise ValueError(
                    "DB_URI template not found in environment variables."
                )
            db_uri = (
                db_uri_template.replace(
                    "<AWS access key>", quote(aws_access_key_id, safe="")
                )
                .replace(
                    "<AWS secret key>", quote(aws_secret_access_key, safe="")
                )
                .replace(
                    "<session token (for AWS IAM Roles)>",
                    (
                        quote(aws_session_token, safe="")
                        if aws_session_token
                        else ""
                    ),
                )
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
                # Load the .env file using dotenv
                load_dotenv(env_file_path)
    else:
        print("Running in development mode.")
        # Use MongoDB for development
        os.environ["USE_DOCUMENTDB"] = "false"
        # Load local .env file
        local_env_file = os.path.join(
            os.path.dirname(__file__), ".env.development"
        )
        load_dotenv(local_env_file)
        # Env file is already loaded, no need to set Config

    # Load config
    try:
        out = AppConfig()  # type: ignore
        print(f"Configuration loaded: {out}")
        return out
    except ValidationError as e:
        print("Configuration validation failed:", e)
        raise


config = initialize_environment()
