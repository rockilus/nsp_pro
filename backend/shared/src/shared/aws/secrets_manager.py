"""AWS Secrets Manager service interface for NSP Pro."""

import json
from typing import Any, Dict, Optional

from botocore.exceptions import BotoCoreError, ClientError
from pydantic import BaseModel, Field, field_serializer, field_validator

from shared.logger import log_error, log_info

from .config import AWSConfig
from .exceptions import DocumentDBCredentialsError, SecretsManagerError


class DocumentDBCredentials(BaseModel):
    """DocumentDB connection credentials."""

    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    host: str = Field(..., description="Database host")
    port: str = Field(..., description="Database port")

    @field_validator("port")
    @classmethod
    def validate_port(cls, v: str) -> str:
        """Validate port is a valid number.

        Args:
            v: Port value to validate

        Returns:
            Validated port string

        Raises:
            ValueError: If port is not a valid number
        """
        try:
            port_int = int(v)
            if not 1 <= port_int <= 65535:
                raise ValueError("Port must be between 1 and 65535")
            return str(port_int)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid port value: {v}") from e

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DocumentDBCredentials":
        """Create credentials from dictionary with validation.

        Args:
            data: Dictionary containing credential fields

        Returns:
            DocumentDBCredentials instance

        Raises:
            DocumentDBCredentialsError: If required fields are missing
                                      or invalid
        """
        required_fields = ["username", "password", "host", "port"]
        missing_fields = [
            field for field in required_fields if field not in data
        ]

        if missing_fields:
            raise DocumentDBCredentialsError(
                f"Missing required credential fields: {missing_fields}",
                missing_fields=missing_fields,
            )

        try:
            return cls(
                username=str(data["username"]),
                password=str(data["password"]),
                host=str(data["host"]),
                port=str(data["port"]),
            )
        except Exception as e:
            raise DocumentDBCredentialsError(
                "Invalid credential data format", original_error=e
            ) from e

    @field_serializer("password", when_used="json")
    def _serialize_password(self, v: str) -> str:
        """Prevent password from being logged in JSON output."""
        return "***"


class SecretsManager:
    """AWS Secrets Manager client for NSP Pro."""

    def __init__(self, aws_config: Optional[AWSConfig] = None) -> None:
        """Initialize Secrets Manager client.

        Args:
            aws_config: AWS configuration, defaults to environment config
        """
        self.aws_config = aws_config or AWSConfig.from_environment()
        self._client = None

    @property
    def client(self) -> Any:
        """Lazy-loaded boto3 Secrets Manager client.

        Returns:
            Configured boto3 Secrets Manager client
        """
        if self._client is None:
            self._client = self.aws_config.create_boto3_client(
                "secretsmanager"
            )
        return self._client

    def get_secret(self, secret_name: str) -> str:
        """Retrieve a secret value from AWS Secrets Manager.

        Args:
            secret_name: Name or ARN of the secret

        Returns:
            Secret value as string

        Raises:
            SecretsManagerError: If secret retrieval fails
        """
        if not secret_name or not secret_name.strip():
            raise SecretsManagerError("Secret name cannot be empty")

        try:
            log_info(f"Retrieving secret from region {self.aws_config.region}")

            response = self.client.get_secret_value(SecretId=secret_name)
            secret_value = response["SecretString"]

            log_info("Secret retrieved successfully")
            return secret_value

        except (BotoCoreError, ClientError) as e:
            error_code = (
                getattr(e, "response", {})
                .get("Error", {})
                .get("Code", "Unknown")
            )
            log_error(f"AWS error retrieving secret: {error_code}")

            raise SecretsManagerError(
                f"Failed to retrieve secret '{secret_name}'",
                error_code=error_code,
                original_error=e,
            ) from e
        except Exception as e:
            log_error("Unexpected error retrieving secret")
            raise SecretsManagerError(
                f"Unexpected error retrieving secret '{secret_name}'",
                original_error=e,
            ) from e

    def get_secret_dict(self, secret_name: str) -> Dict[str, Any]:
        """Retrieve and parse a JSON secret from AWS Secrets Manager.

        Args:
            secret_name: Name or ARN of the secret

        Returns:
            Parsed secret as dictionary

        Raises:
            SecretsManagerError: If secret retrieval or parsing fails
        """
        secret_value = self.get_secret(secret_name)

        try:
            return json.loads(secret_value)
        except json.JSONDecodeError as e:
            log_error("Failed to parse secret JSON")
            raise SecretsManagerError(
                f"Invalid JSON format in secret '{secret_name}'",
                original_error=e,
            ) from e

    def get_documentdb_credentials(
        self, secret_name: Optional[str] = None
    ) -> DocumentDBCredentials:
        """Retrieve DocumentDB credentials from AWS Secrets Manager.

        Args:
            secret_name: Name or ARN of the DocumentDB credentials secret.
                        If None, uses config default.

        Returns:
            DocumentDB credentials object

        Raises:
            DocumentDBCredentialsError: If credential retrieval or
                                      validation fails
        """
        secret_name = secret_name or self.aws_config.documentdb_secret_name

        try:
            credentials_dict = self.get_secret_dict(secret_name)
            credentials = DocumentDBCredentials.from_dict(credentials_dict)

            log_info(
                "DocumentDB credentials retrieved and validated successfully"
            )
            return credentials

        except SecretsManagerError as e:
            # Re-raise as DocumentDB-specific error
            raise DocumentDBCredentialsError(
                f"Failed to retrieve DocumentDB credentials from "
                f"'{secret_name}': {e.message}",
                error_code=e.error_code,
                original_error=e.original_error,
            ) from e
        except Exception as e:
            log_error("Unexpected error retrieving DocumentDB credentials")
            raise DocumentDBCredentialsError(
                f"Unexpected error retrieving DocumentDB credentials "
                f"from '{secret_name}'",
                original_error=e,
            ) from e
