import os
import ssl
import tempfile
import urllib.error
import urllib.request

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from shared.aws import DocumentDBCredentialsError, SecretsManager
from shared.database.config import DatabaseConfig, DatabaseType
from shared.logger import log_error, log_info

# Enhanced DocumentDB Security Features:
# 1. Certificate validation for CA bundle downloads
# 2. Secure connection URI building with proper escaping
# 3. Enhanced error handling and logging
# 4. Connection validation utility
# 5. SSL verification for certificate downloads


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

    # MongoDB configuration
    mongodb_uri: str | None = Field(None, description="Database connection URL")
    mongodb_database_name: str = Field("test", description="MongoDB database name")

    # DocumentDB configuration
    use_documentdb: bool = Field(
        False, description="Whether to use DocumentDB instead of MongoDB"
    )
    documentdb_secret_name: str = Field(
        "", description="AWS Secrets Manager secret name for DocumentDB"
    )
    documentdb_database_name: str = Field(
        "rockilus-prod", description="DocumentDB database name"
    )
    documentdb_ca_bundle_path: str = Field(
        "global-bundle.pem",
        description="Path to DocumentDB CA bundle certificate",
    )

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
    task_expiration: int = Field(90, description="Task expiration time in seconds")
    aws_region: str = Field(
        "eu-west-3",
        description="AWS region for services like SQS and Secrets Manager",
    )
    aws_access_key_id: str | None = Field(
        None, description="AWS access key ID for authentication"
    )
    aws_secret_access_key: str | None = Field(
        None, description="AWS secret access key for authentication"
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
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env.development"),
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields from env
    )

    def get_database_config(self) -> DatabaseConfig:
        """Create database configuration based on environment."""
        if self.environment == "development":
            log_info("Configuring MongoDB for development environment")
            if not self.mongodb_uri:
                raise ValueError(
                    "MongoDB URI must be set in development mode. Please check "
                    + "your .env.development file."
                )
            return DatabaseConfig(
                database_type=DatabaseType.MONGODB,
                mongodb_uri=self.mongodb_uri,
                database_name=self.mongodb_database_name,
            )

        log_info("Configuring DocumentDB for production environment")

        # Use the new AWS Secrets Manager to retrieve DocumentDB credentials
        try:
            secrets_manager = SecretsManager()
            credentials = secrets_manager.get_documentdb_credentials(
                self.documentdb_secret_name
            )

            log_info(
                f"Retrieved DocumentDB credentials for host: " f"{credentials.host}"
            )

            return DatabaseConfig(
                database_type=DatabaseType.DOCUMENTDB,
                documentdb_host=credentials.host,
                documentdb_port=int(credentials.port),
                documentdb_username=credentials.username,
                documentdb_password=credentials.password,
                database_name=self.documentdb_database_name,
                documentdb_ca_bundle_path=self.documentdb_ca_bundle_path,
            )

        except DocumentDBCredentialsError as e:
            log_error(f"Failed to retrieve DocumentDB credentials: {e.message}")
            if e.missing_fields:
                log_error(f"Missing credential fields: {e.missing_fields}")
            raise ValueError(
                "Unable to configure DocumentDB: credential retrieval failed"
            ) from e


# Step 2: Functions to retrieve variables
# def get_secret(secret_name: str, region_name: str = "eu-west-3") -> str:
#     try:
#         client = boto3.client("secretsmanager", region_name=region_name)
#         response = client.get_secret_value(SecretId=secret_name)
#         secret = response["SecretString"]
#         return secret
#     except (BotoCoreError, ClientError) as error:
#         print(f"Error retrieving secret {secret_name}: {error}")
#         raise error


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


# def get_documentdb_credentials(
#     secret_name: str, region_name: str = "eu-west-3"
# ) -> dict[str, str]:
#     """Retrieve DocumentDB credentials from AWS Secrets Manager.

#     This function is kept for backward compatibility but now uses
#     the shared AWS module for consistency and better error handling.
#     """
#     from shared.aws import AWSConfig

#     try:
#         # Create AWS configuration for the specific region
#         aws_config = AWSConfig.from_environment()
#         aws_config.region = region_name
#         aws_config.documentdb_secret_name = secret_name

#         # Use the shared AWS module
#         secrets_manager = SecretsManager(aws_config)
#         credentials = secrets_manager.get_documentdb_credentials()

#         log_info("DocumentDB credentials retrieved successfully")

#         return {
#             "username": credentials.username,
#             "password": credentials.password,
#             "host": credentials.host,
#             "port": credentials.port,
#         }

#     except DocumentDBCredentialsError as e:
#         log_error(f"Failed to retrieve DocumentDB credentials: {e.message}")
#         if e.missing_fields:
#             log_error(f"Missing credential fields: {e.missing_fields}")
#         raise e
#     except (BotoCoreError, ClientError) as e:
#         log_error("AWS service error retrieving DocumentDB credentials")
#         raise e


def _validate_ca_content(content: bytes) -> bool:
    """Validate that the content contains valid PEM certificates."""
    try:
        content_str = content.decode('utf-8')
        # Basic validation: check for PEM certificate markers
        return (
            "-----BEGIN CERTIFICATE-----" in content_str
            and "-----END CERTIFICATE-----" in content_str
            and len(content_str) > 1000  # Reasonable minimum size
        )
    except (UnicodeDecodeError, ValueError):
        return False


def _validate_ca_bundle(ca_bundle_path: str) -> bool:
    """Validate that the CA bundle file exists and contains certificates."""
    try:
        with open(ca_bundle_path, 'rb') as f:
            content = f.read()
        return _validate_ca_content(content)
    except (OSError, IOError):
        return False


def download_documentdb_ca_bundle(
    ca_bundle_path: str = "global-bundle.pem",
) -> None:
    """Download DocumentDB CA bundle certificate with integrity validation."""

    print(f"Downloading DocumentDB CA bundle to {ca_bundle_path}")

    # Skip download if file already exists and is valid
    if os.path.exists(ca_bundle_path) and _validate_ca_bundle(ca_bundle_path):
        print(f"Valid DocumentDB CA bundle already exists at {ca_bundle_path}")
        return

    # For development, use a different path that we can write to
    if not os.path.exists(os.path.dirname(ca_bundle_path)):
        if ca_bundle_path.startswith("/app"):
            # In development, use a writable path
            ca_bundle_path = os.path.join(
                os.path.dirname(__file__), "..", "global-bundle.pem"
            )
            ca_bundle_path = os.path.abspath(ca_bundle_path)

    ca_bundle_url = "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"

    try:
        # Create directory if it doesn't exist and we have permission
        dir_path = os.path.dirname(ca_bundle_path)
        if not os.path.exists(dir_path):
            try:
                os.makedirs(dir_path, exist_ok=True)
            except (OSError, PermissionError):
                print(f"Cannot create directory {dir_path}, using temp")
                ca_bundle_path = os.path.join(
                    tempfile.gettempdir(), "global-bundle.pem"
                )

        # Download with SSL verification
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED

        with urllib.request.urlopen(ca_bundle_url, context=ssl_context) as response:
            ca_content = response.read()

        # Validate certificate content before writing
        if not _validate_ca_content(ca_content):
            raise ValueError("Downloaded CA bundle failed validation")

        with open(ca_bundle_path, 'wb') as f:
            f.write(ca_content)

        print(f"DocumentDB CA bundle downloaded and validated: {ca_bundle_path}")
        # Update environment variable with actual path
        os.environ["DOCUMENTDB_CA_BUNDLE_PATH"] = ca_bundle_path

    except (urllib.error.URLError, OSError, ValueError) as e:
        print(f"Error downloading DocumentDB CA bundle: {e}")
        # Don't raise in development, just warn
        if os.getenv("ENVIRONMENT", "production").lower() == "production":
            raise


# def build_documentdb_connection_uri(
#     credentials: dict[str, str],
#     ca_bundle_path: str,
#     database_name: str = "nsp_pro",
# ) -> str:
#     """Build secure DocumentDB connection URI with proper escaping."""

#     # Validate inputs
#     required_fields = ["username", "password", "host", "port"]
#     for field in required_fields:
#         if field not in credentials:
#             raise ValueError(f"Missing required credential field: {field}")

#     if not os.path.exists(ca_bundle_path):
#         raise FileNotFoundError(f"CA bundle not found at {ca_bundle_path}")

#     # URL-encode credentials to handle special characters
#     username = quote(credentials["username"], safe="")
#     password = quote(credentials["password"], safe="")
#     host = credentials["host"]
#     port = credentials["port"]

#     # Build connection URI with security parameters
#     connection_uri = (
#         f"mongodb://{username}:{password}@{host}:{port}/{database_name}"
#         f"?tls=true"
#         f"&tlsCAFile={ca_bundle_path}"
#         f"&tlsAllowInvalidHostnames=false"
#         f"&tlsAllowInvalidCertificates=false"
#         f"&replicaSet=rs0"
#         f"&readPreference=secondaryPreferred"
#         f"&retryWrites=false"
#         f"&authSource=admin"
#         f"&ssl_cert_reqs=required"
#     )

#     return connection_uri


# Step 3: Main function to initialize config
# pylint: disable=too-many-locals, too-many-statements, too-many-branches
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
        # documentdb_secret = f"nsp-pro/{environment}/documentdb/credentials"
        documentdb_secret = "rockilus/prod/documentdb/credentials"
        os.environ["DOCUMENTDB_SECRET_NAME"] = documentdb_secret
        os.environ["DOCUMENTDB_DATABASE_NAME"] = "nsp_pro"

        # Download CA bundle for DocumentDB TLS connection
        download_documentdb_ca_bundle()

        # if not os.getenv("DB_URI"):
        #     print("DB_URI not set; retrieving it from Secrets Manager.")
        #     # Retrieve secret from Secrets Manager
        #     secret_name = "DB_URI"
        #     secret = get_secret(secret_name, region_name=region)
        #     print(f"Retrieved DB_URI secret for {secret_name}: {secret}")
        #     if secret:
        #         os.environ["SECRET_VALUE"] = secret  # Store in environment variables

        # Fetch AWS credentials
        # session = boto3.Session()
        # credentials = session.get_credentials()
        # if credentials:
        #     aws_access_key_id = credentials.access_key
        #     aws_secret_access_key = credentials.secret_key
        #     aws_session_token = credentials.token

        #     if aws_session_token is None:
        #         raise ValueError("AWS access key ID is not set.")

        # Set AWS credentials in environment variables for Pydantic
        # os.environ["AWS_ACCESS_KEY_ID"] = aws_access_key_id
        # os.environ["AWS_SECRET_ACCESS_KEY"] = aws_secret_access_key
        # os.environ["AWS_SESSION_TOKEN"] = aws_session_token

        # Set endpoint_url to None for production (use real AWS services)
        # os.environ["ENDPOINT_URL"] = ""  # Empty = None for Pydantic

        # print("AWS credentials retrieved and set from boto3 session")

        # For DocumentDB, use enhanced credential retrieval and
        # URI building
        # if os.getenv("USE_DOCUMENTDB", "false").lower() == "true":
        #     try:
        #         # Get DocumentDB credentials using enhanced function
        #         documentdb_credentials = get_documentdb_credentials(
        #             documentdb_secret, region
        #         )

        #         # Get the CA bundle path
        #         ca_bundle_path = os.getenv(
        #             "DOCUMENTDB_CA_BUNDLE_PATH", "global-bundle.pem"
        #         )

        #         # Build secure connection URI
        #         db_uri = build_documentdb_connection_uri(
        #             documentdb_credentials,
        #             ca_bundle_path,
        #             database_name="nsp_pro",
        #         )
        #         print(f"Built DocumentDB connection URI: {db_uri}")
        #         os.environ["DB_URI"] = db_uri
        #         log_info("DocumentDB connection URI built successfully")

        #     except (
        #         DocumentDBCredentialsError,
        #         ValueError,
        #         FileNotFoundError,
        #     ) as e:
        #         log_error(f"Failed to build DocumentDB URI: {str(e)}")
        #         # Fallback to template-based approach if enhanced
        #         # method fails
        #         db_uri_template = os.getenv("DB_URI")
        #         if db_uri_template:
        #             db_uri = (
        #                 db_uri_template.replace(
        #                     "<AWS access key>",
        #                     quote(aws_access_key_id, safe=""),
        #                 )
        #                 .replace(
        #                     "<AWS secret key>",
        #                     quote(aws_secret_access_key, safe=""),
        #                 )
        #                 .replace(
        #                     "<session token (for AWS IAM Roles)>",
        #                     (
        #                         quote(aws_session_token, safe="")
        #                         if aws_session_token
        #                         else ""
        #                     ),
        #                 )
        #             )
        #             os.environ["DB_URI"] = db_uri
        #         else:
        #             raise ValueError(
        #                 "No valid DB_URI configuration available"
        #             ) from e
        # else:
        #     # For MongoDB, use template-based approach
        #     db_uri_template = os.getenv("DB_URI")
        #     if not db_uri_template:
        #         raise ValueError(
        #             "DB_URI template not found in environment variables."
        #         )
        #     db_uri = (
        #         db_uri_template.replace(
        #             "<AWS access key>", quote(aws_access_key_id, safe="")
        #         )
        #         .replace(
        #             "<AWS secret key>",
        #             quote(aws_secret_access_key, safe=""),
        #         )
        #         .replace(
        #             "<session token (for AWS IAM Roles)>",
        #             (
        #                 quote(aws_session_token, safe="")
        #                 if aws_session_token
        #                 else ""
        #             ),
        #         )
        #     )
        #     os.environ["DB_URI"] = db_uri

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
        local_env_file = os.path.join(os.path.dirname(__file__), ".env.development")
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
