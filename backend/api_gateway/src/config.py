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
    task_expiration: int = Field(..., description="Task expiration time in seconds")
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
            aws_access_key_id = credentials.access_key
            aws_secret_access_key = credentials.secret_key
            aws_session_token = credentials.token

            # Set AWS credentials in environment variables for Pydantic
            os.environ["AWS_ACCESS_KEY_ID"] = aws_access_key_id
            os.environ["AWS_SECRET_ACCESS_KEY"] = aws_secret_access_key
            os.environ["AWS_SESSION_TOKEN"] = aws_session_token

            # Set endpoint_url to None for production (use real AWS services)
            # os.environ["ENDPOINT_URL"] = ""  # Empty string = None for Pydantic

            print("AWS credentials retrieved and set from boto3 session")

            # Replace placeholders in the DB_URI with actual AWS credentials
            db_uri_template = os.getenv("DB_URI")
            if not db_uri_template:
                raise ValueError("DB_URI template not found in environment variables.")
            db_uri = (
                db_uri_template.replace(
                    "<AWS access key>", quote(aws_access_key_id, safe="")
                )
                .replace("<AWS secret key>", quote(aws_secret_access_key, safe=""))
                .replace(
                    "<session token (for AWS IAM Roles)>",
                    (quote(aws_session_token, safe="") if aws_session_token else ""),
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


# import os
# import tempfile
# from urllib.parse import quote

# import boto3  # type: ignore
# from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
# from dotenv import load_dotenv
# from pydantic import Field, ValidationError
# from pydantic_settings import BaseSettings


# # Step 1: Define your Pydantic Config Class
# class AppConfig(BaseSettings):
#     environment: str = Field(
#         "development", description="Environment (development or production)"
#     )
#     api_domain: str = Field(..., description="API domain")
#     api_url: str = Field(..., description="API URL")
#     api_port: int = Field(..., description="API port")
#     origins: list[str] = Field(..., description="Allowed origins for CORS")
#     client_url: str = Field(..., description="Client URL")
#     db_uri: str = Field(..., description="Database connection URL")
#     st_connection_uri: str = Field(..., description="Supertokens connection URI")
#     st_api_key: str = Field(..., description="Supertokens API key")
#     st_dashboard_admins: list[str] = Field(
#         ..., description="SuperTokens dashboard admins"
#     )
#     st_cookie_domain: str = Field(..., description="SuperTokens cookie domain")
#     pdp_url: str = Field(..., description="Policy Decision Point URL")
#     pdp_api_key: str = Field(..., description="Policy Decision Point API key")
#     uvicorn_reload: bool = Field(
#         False,
#         description="Enable Uvicorn auto-reload",
#     )
#     task_expiration: int = Field(..., description="Task expiration time in seconds")
#     aws_region: str = Field(
#         "eu-west-3",
#         description="AWS region for services like SQS and Secrets Manager",
#     )
#     aws_access_key_id: str = Field(
#         ..., description="AWS access key ID for authentication"
#     )
#     aws_secret_access_key: str = Field(
#         ..., description="AWS secret access key for authentication"
#     )
#     endpoint_url: str | None = Field(
#         None,
#         description="Endpoint URL for local AWS services (None for prod)",
#     )

#     # pylint: disable=too-few-public-methods
#     class Config:
#         # Set environment variable precedence
#         env_prefix: str = ""  # No prefix; can adjust if needed
#         env_file: str | None = None  # Set dynamically for development


# # Step 2: Functions to retrieve variables
# def get_secret(secret_name: str, region_name: str = "eu-west-3") -> str:
#     """Retrieve secret from AWS Secrets Manager."""
#     try:
#         client = boto3.client("secretsmanager", region_name=region_name)
#         response = client.get_secret_value(SecretId=secret_name)
#         secret = response["SecretString"]
#         return secret
#     except (BotoCoreError, ClientError) as error:
#         print(f"Error retrieving secret {secret_name}: {error}")
#         raise error


# def download_env_file_from_s3(
#     bucket_name: str, file_key: str, region_name: str = "eu-west-3"
# ) -> str:
#     """Download .env file from S3 for production environment."""
#     try:
#         s3_client = boto3.client("s3", region_name=region_name)

#         # Temporary file to store the downloaded .env
#         with tempfile.NamedTemporaryFile(delete=False) as temp_file:
#             s3_client.download_file(bucket_name, file_key, temp_file.name)
#             temp_file_path = temp_file.name

#         # Return the path to the temporary file for Pydantic to use
#         return temp_file_path
#     except (BotoCoreError, ClientError) as error:
#         print(f"Error downloading or loading .env file from S3: {error}")
#         raise error


# # Step 3: Main function to initialize config
# # pylint: disable=too-many-locals, too-many-statements, too-many-branches
# def initialize_environment() -> AppConfig:
#     """Initialize configuration for both dev and production environments."""
#     # Determine environment (development or production)
#     environment = os.getenv(
#         "ENVIRONMENT", "development"
#     ).lower()  # Default to development

#     if environment == "production":
#         print("Running in production mode.")

#         region = "eu-west-3"

#         # Handle AWS credentials first
#         session = boto3.Session()
#         credentials = session.get_credentials()

#         if credentials:
#             # Set AWS credentials in environment variables for Pydantic
#             os.environ["AWS_ACCESS_KEY_ID"] = quote(credentials.access_key, safe="")
#             os.environ["AWS_SECRET_ACCESS_KEY"] = quote(
# credentials.secret_key, safe=""
# )

#             # Set endpoint_url to None for production (use real AWS services)
#             os.environ["ENDPOINT_URL"] = ""  # Empty string = None for Pydantic

#             print("AWS credentials retrieved and set from boto3 session")
#         else:
#             raise ValueError("Unable to retrieve AWS credentials from boto3 session")

#         # Handle database URI with credentials if needed
#         if not os.getenv("DB_URI"):
#             print("DB_URI not set; retrieving it from Secrets Manager.")
#             try:
#                 secret_name = "DB_URI"
#                 db_uri_secret = get_secret(secret_name, region_name=region)
#                 if db_uri_secret:
#                     # If the DB URI contains placeholders, replace them
#                     if "<AWS access key>" in db_uri_secret:
#                         aws_session_token = (
#                             quote(credentials.token, safe="")
#                             if credentials.token
#                             else ""
#                         )
#                         db_uri = (
#                             db_uri_secret.replace(
#                                 "<AWS access key>",
#                                 os.environ["AWS_ACCESS_KEY_ID"],
#                             )
#                             .replace(
#                                 "<AWS secret key>",
#                                 os.environ["AWS_SECRET_ACCESS_KEY"],
#                             )
#                             .replace(
#                                 "<session token (for AWS IAM Roles)>",
#                                 aws_session_token,
#                             )
#                         )
#                     else:
#                         db_uri = db_uri_secret
#                     os.environ["DB_URI"] = db_uri
#                     print("DB_URI retrieved and set from Secrets Manager")
#             except (BotoCoreError, ClientError) as e:
#                 print(f"Error retrieving DB_URI from Secrets Manager: {e}")
#                 raise

#         # Check for other required environment variables
#         required_env_vars = [
#             "API_DOMAIN",
#             "API_URL",
#             "API_PORT",
#             "ORIGINS",
#             "CLIENT_URL",
#             "ST_CONNECTION_URI",
#             "ST_API_KEY",
#             "ST_DASHBOARD_ADMINS",
#             "ST_COOKIE_DOMAIN",
#             "PDP_URL",
#             "PDP_API_KEY",
#             "TASK_EXPIRATION",
#         ]

#         missing_vars = [var for var in required_env_vars if not os.getenv(var)]

#         if missing_vars:
#             print(f"Missing required environment variables: {missing_vars}")
#             print("Attempting to retrieve .env file from S3...")
#             try:
#                 bucket_name = "nsp-pro-bucket"
#                 file_key = ".env"
#                 env_file_path = download_env_file_from_s3(
#                     bucket_name, file_key, region_name=region
#                 )
#                 # Load the downloaded .env file
#                 load_dotenv(env_file_path)
#                 print("Environment variables loaded from S3 .env file")
#             except (BotoCoreError, ClientError) as e:
#                 print(f"Error loading .env file from S3: {e}")
#                 # Continue without S3 .env file - maybe vars are set elsewhere

#     else:
#         print("Running in development mode.")
#         # Load local .env file for development
#         local_env_file = os.path.join(os.path.dirname(__file__), ".env.development")
#         if os.path.exists(local_env_file):
#             load_dotenv(local_env_file)
#             print(f"Loaded development environment from {local_env_file}")
#         else:
#             print("No .env.development file found, using system env variables")

#         # Set default endpoint_url for development (LocalStack)
#         if not os.getenv("ENDPOINT_URL"):
#             os.environ["ENDPOINT_URL"] = "http://localhost:4566"

#     # Validate that critical variables are now set
#     critical_vars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "DB_URI"]
#     missing_critical = [var for var in critical_vars if not os.getenv(var)]

#     if missing_critical:
#         print(f"Critical env variables still missing: {missing_critical}")
#         raise ValueError(f"Missing critical environment variables: {
# missing_critical
# }")

#     # Load and validate config
#     try:
#         print("Initializing AppConfig with environment variables...")
#         config_instance = AppConfig()  # type: ignore
#         print("Configuration loaded successfully")
#         print(f"Environment: {config_instance.environment}")
#         print(f"AWS Region: {config_instance.aws_region}")
#         print(f"Endpoint URL: {config_instance.endpoint_url}")
#         return config_instance
#     except ValidationError as e:
#         print("Configuration validation failed:")
#         for error in e.errors():
#             print(f"  - {error['loc'][0]}: {error['msg']}")
#         raise


# config = initialize_environment()
