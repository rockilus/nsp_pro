import os
import ssl
import tempfile
import urllib.error
import urllib.request

from dotenv import load_dotenv
from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from shared.aws import DocumentDBCredentialsError, SecretsManager
from shared.database.config import DatabaseConfig, DatabaseType
from shared.logger import log_error, log_info


# Step 1: Define your Pydantic Config Class
class AppConfig(BaseSettings):
    environment: str = Field(
        "development", description="Environment (development or production)"
    )

    # MongoDB configuration (development)
    mongodb_uri: str | None = Field(None, description="MongoDB connection URL")
    mongodb_database_name: str = Field("test", description="MongoDB database name")

    # DocumentDB configuration (production)
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

    # AWS configuration
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
        description="Endpoint URL for local AWS services",
    )

    # SQS configuration
    sqs_queue_name: str = Field(
        "nsp-pro-solve-queue", description="SQS queue name for solve requests"
    )
    sqs_visibility_timeout: int = Field(
        300, description="SQS message visibility timeout"
    )
    sqs_max_receive_count: int = Field(
        3, description="Maximum receive count before DLQ"
    )

    model_config = SettingsConfigDict(
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
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

        # Use the shared AWS Secrets Manager
        try:
            secrets_manager = SecretsManager()
            credentials = secrets_manager.get_documentdb_credentials(
                self.documentdb_secret_name
            )

            log_info(f"Retrieved DocumentDB credentials for host: {credentials.host}")

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


def _validate_ca_content(content: bytes) -> bool:
    """Validate that the content contains valid PEM certificates."""
    try:
        content_str = content.decode("utf-8")
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
        with open(ca_bundle_path, "rb") as f:
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

        with open(ca_bundle_path, "wb") as f:
            f.write(ca_content)

        print(f"DocumentDB CA bundle downloaded and validated: {ca_bundle_path}")
        # Update environment variable with actual path
        os.environ["DOCUMENTDB_CA_BUNDLE_PATH"] = ca_bundle_path

    except (urllib.error.URLError, OSError, ValueError) as e:
        print(f"Error downloading DocumentDB CA bundle: {e}")
        # Don't raise in development, just warn
        if os.getenv("ENVIRONMENT", "production").lower() == "production":
            raise


def initialize_environment() -> AppConfig:
    """Initialize configuration based on environment."""
    environment = os.getenv("ENVIRONMENT", "development").lower()

    if environment == "production":
        log_info("Running in production mode")

        # Set DocumentDB configuration
        os.environ["USE_DOCUMENTDB"] = "true"
        os.environ["DOCUMENTDB_SECRET_NAME"] = "rockilus/prod/documentdb/credentials"
        os.environ["DOCUMENTDB_DATABASE_NAME"] = "nsp_pro"

        # Download CA bundle if needed
        try:
            download_documentdb_ca_bundle()
        except ImportError:
            log_info("CA bundle download not available, assuming bundle exists")

    else:
        log_info("Running in development mode")
        os.environ["USE_DOCUMENTDB"] = "false"

        # Load local .env file
        local_env_file = os.path.join(os.path.dirname(__file__), ".env.development")
        load_dotenv(local_env_file)

    try:
        out = AppConfig()  # type: ignore
        log_info("Configuration loaded successfully")
        return out
    except ValidationError as e:
        log_error(f"Configuration validation failed: {e}")
        raise


config = initialize_environment()
