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
    aws_access_key_id: str = Field(..., description="AWS access key ID")
    aws_secret_access_key: str = Field(..., description="AWS secret access key")
    aws_session_token: Optional[str] = Field(
        default=None,
        description="AWS session token (optional for temporary credentials)",
    )
    endpoint_url: Optional[str] = Field(
        default=None, description="Custom endpoint URL for local AWS services"
    )

    # SQS Configuration
    sqs_solve_queue_name: str = Field(..., description="SQS solve queue name")
    sqs_solve_dlq_name: Optional[str] = Field(
        default=None, description="SQS solve DLQ name"
    )
    sqs_visibility_timeout_seconds: int = Field(
        default=900, description="SQS visibility timeout in seconds"
    )
    sqs_message_retention_period: int = Field(
        default=1209600, description="SQS message retention period in seconds"
    )
    sqs_receive_message_wait_time: int = Field(
        default=20, description="SQS long polling wait time"
    )
    sqs_max_receive_count: int = Field(
        default=3, description="Maximum receive count before moving to DLQ"
    )

    # Secrets Manager Configuration
    documentdb_secret_name: str = Field(
        default="rockilus/prod/documentdb/credentials",
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
            sqs_solve_queue_name=os.getenv("AWS_SQS_SOLVE_QUEUE_NAME", "solve-queue"),
            sqs_solve_dlq_name=os.getenv("AWS_SQS_SOLVE_DLQ_NAME"),
            sqs_visibility_timeout_seconds=int(
                os.getenv("AWS_SQS_VISIBILITY_TIMEOUT_SECONDS", "900")
            ),
            sqs_message_retention_period=int(
                os.getenv("AWS_SQS_MESSAGE_RETENTION_PERIOD", "1209600")
            ),
            sqs_receive_message_wait_time=int(
                os.getenv("AWS_SQS_RECEIVE_MESSAGE_WAIT_TIME", "20")
            ),
            sqs_max_receive_count=int(os.getenv("AWS_SQS_MAX_RECEIVE_COUNT", "3")),
            documentdb_secret_name=os.getenv(
                "AWS_DOCUMENTDB_SECRET_NAME",
                "rockilus/prod/documentdb/credentials",
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
                sqs_solve_queue_name=os.getenv(
                    "AWS_SQS_SOLVE_QUEUE_NAME", "solve-queue"
                ),
                sqs_solve_dlq_name=os.getenv("AWS_SQS_SOLVE_DLQ_NAME"),
                sqs_visibility_timeout_seconds=int(
                    os.getenv("AWS_SQS_VISIBILITY_TIMEOUT_SECONDS", "900")
                ),
                sqs_message_retention_period=int(
                    os.getenv("AWS_SQS_MESSAGE_RETENTION_PERIOD", "1209600")
                ),
                sqs_receive_message_wait_time=int(
                    os.getenv("AWS_SQS_RECEIVE_MESSAGE_WAIT_TIME", "20")
                ),
                sqs_max_receive_count=int(os.getenv("AWS_SQS_MAX_RECEIVE_COUNT", "3")),
                documentdb_secret_name=os.getenv(
                    "AWS_DOCUMENTDB_SECRET_NAME",
                    "rockilus/prod/documentdb/credentials",
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
