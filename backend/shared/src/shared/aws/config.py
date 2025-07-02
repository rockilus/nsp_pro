"""AWS configuration for NSP Pro."""

from typing import Optional

from pydantic import BaseModel, Field


# pylint: disable=too-few-public-methods
class AWSConfig(BaseModel):
    """AWS configuration settings."""

    region: str = Field(default="eu-west-3", description="AWS region")
    access_key_id: Optional[str] = Field(
        default=None, description="AWS access key ID"
    )
    secret_access_key: Optional[str] = Field(
        default=None, description="AWS secret access key"
    )
    endpoint_url: Optional[str] = Field(
        default=None, description="Custom endpoint URL for local AWS services"
    )

    # SQS Configuration
    sqs_solve_queue_name: str = Field(
        default="nsp-pro-dev-solve-queue", description="SQS solve queue name"
    )
    sqs_solve_dlq_name: str = Field(
        default="nsp-solve-dlq", description="SQS solve DLQ name"
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

    class Config:
        """Pydantic configuration."""

        env_prefix = "AWS_"
        case_sensitive = False
