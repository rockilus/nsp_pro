"""AWS configuration for NSP Pro."""

import os
from typing import Any, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from pydantic import BaseModel, Field

from shared.logger import log_error, log_info

from .exceptions import AWSServiceError


# pylint: disable=too-few-public-methods
class AWSConfig(BaseModel):
    """AWS configuration settings."""

    region: str = Field(default="eu-west-3", description="AWS region")
    aws_access_key_id: Optional[str] = Field(None, description="AWS access key ID")
    aws_secret_access_key: Optional[str] = Field(
        None, description="AWS secret access key"
    )
    aws_session_token: Optional[str] = Field(
        default=None,
        description="AWS session token (optional for temporary credentials)",
    )
    endpoint_url: Optional[str] = Field(
        default=None, description="Custom endpoint URL for local AWS services"
    )

    # SQS Configuration - Queue URLs (managed by Terraform)
    sqs_solve_queue_url: str = Field(..., description="SQS solve queue URL")
    sqs_email_queue_url: Optional[str] = Field(
        default=None, description="SQS email queue URL"
    )

    # Secrets Manager Configuration
    documentdb_secret_name: str = Field(
        # default="rockilus/prod/documentdb/credentials",
        description="DocumentDB credentials secret name",
    )

    class Config:
        """Pydantic configuration."""

        env_prefix = "AWS_"
        case_sensitive = False

    @classmethod
    def from_environment(cls) -> "AWSConfig":
        """Create AWS config from environment variables.

        Returns:
            AWSConfig instance populated from environment

        Raises:
            ValidationError: If required environment variables are missing
        """
        # Use environment variables with defaults for optional fields
        return cls(
            region=os.getenv("AWS_REGION", "eu-west-3"),
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", ""),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", ""),
            aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
            endpoint_url=os.getenv("AWS_ENDPOINT_URL"),
            sqs_solve_queue_url=os.getenv(
                "AWS_SQS_SOLVE_QUEUE_URL",
                "",
            ),
            sqs_email_queue_url=os.getenv("AWS_SQS_EMAIL_QUEUE_URL"),
            documentdb_secret_name=os.getenv(
                "DOCUMENTDB_SECRET_NAME",
                "",
            ),
        )

    @classmethod
    def from_boto3_session(cls, region: str = "eu-west-3") -> "AWSConfig":
        """Create AWS config from boto3 session credentials.

        Args:
            region: AWS region to use

        Returns:
            AWSConfig instance with credentials from boto3 session

        Raises:
            AWSServiceError: If credentials cannot be retrieved
        """
        try:
            session = boto3.Session()
            credentials = session.get_credentials()

            if not credentials:
                raise AWSServiceError(
                    "No AWS credentials available in boto3 session",
                    service="boto3",
                )

            log_info("AWS credentials retrieved from boto3 session")

            # Create config with required fields from boto3 and defaults
            return cls(
                region=region,
                aws_access_key_id=credentials.access_key,
                aws_secret_access_key=credentials.secret_key,
                aws_session_token=credentials.token,
                sqs_solve_queue_url=os.getenv(
                    "AWS_SQS_SOLVE_QUEUE_URL",
                    "",
                ),
                documentdb_secret_name=os.getenv(
                    "DOCUMENTDB_SECRET_NAME",
                    "",
                    # "rockilus/prod/documentdb/credentials",
                ),
                endpoint_url=os.getenv("AWS_ENDPOINT_URL"),
            )

        except (BotoCoreError, ClientError) as e:
            error_code = (
                getattr(e, "response", {}).get("Error", {}).get("Code", "Unknown")
            )
            log_error(
                f"Failed to retrieve AWS credentials from boto3 session: "
                f"{error_code}"
            )
            raise AWSServiceError(
                "Failed to retrieve AWS credentials from boto3 session",
                service="boto3",
                error_code=error_code,
                original_error=e,
            ) from e

    def create_boto3_client(self, service_name: str) -> Any:
        """Create a boto3 client with this configuration.

        Args:
            service_name: Name of the AWS service

        Returns:
            Configured boto3 client
        """
        kwargs = {"region_name": self.region}

        # Always use explicit credentials for security
        if self.aws_access_key_id and self.aws_secret_access_key:
            kwargs.update(
                {
                    "aws_access_key_id": self.aws_access_key_id,
                    "aws_secret_access_key": self.aws_secret_access_key,
                }
            )

        if self.aws_session_token:
            kwargs["aws_session_token"] = self.aws_session_token

        if self.endpoint_url:
            kwargs["endpoint_url"] = self.endpoint_url

        return boto3.client(service_name, **kwargs)  # type: ignore


def create_aws_config(app_config: Any) -> AWSConfig:
    """Create AWSConfig from application config object.

    This factory function provides a consistent way to construct AWSConfig
    across different services, eliminating code duplication.

    Args:
        app_config: Application configuration object with AWS settings

    Returns:
        Configured AWSConfig instance
    """
    return AWSConfig(
        region=app_config.aws_region,
        aws_access_key_id=app_config.aws_access_key_id,
        aws_secret_access_key=app_config.aws_secret_access_key,
        aws_session_token=app_config.aws_session_token,
        endpoint_url=app_config.endpoint_url,
        sqs_solve_queue_url=app_config.sqs_solve_queue_url,
        sqs_email_queue_url=getattr(app_config, "sqs_email_queue_url", None),
        documentdb_secret_name=app_config.documentdb_secret_name,
    )
