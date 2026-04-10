"""Utilities for AWS configuration management."""

import os

from .config import AWSConfig


def get_aws_config_from_env() -> AWSConfig:
    """Create AWS configuration from environment variables.

    Returns:
        AWSConfig instance with values from environment
    """
    return AWSConfig(
        region=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test_access_key"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test_secret_key"),
        sqs_solve_queue_url=os.getenv("AWS_SQS_SOLVE_QUEUE_URL", ""),
        sqs_email_queue_url=os.getenv("AWS_SQS_EMAIL_QUEUE_URL", ""),
        documentdb_secret_name=os.getenv("DOCUMENTDB_SECRET_NAME", ""),
    )


# pylint: disable=too-many-return-statements
def validate_aws_config(config: AWSConfig) -> bool:
    """Validate AWS configuration.

    Args:
        config: AWS configuration to validate

    Returns:
        True if configuration is valid, False otherwise
    """
    # For production, we might want to require credentials
    # For development, we can use IAM roles or default profiles
    if config.aws_access_key_id and not config.aws_secret_access_key:
        return False
    if config.aws_secret_access_key and not config.aws_access_key_id:
        return False

    # Validate queue names
    # if not config.sqs_solve_queue_name:
    if not config.sqs_solve_queue_url:
        return False

    return True


def get_environment_type() -> str:
    """Get the current environment type.

    Returns:
        Environment type (development, staging, production)
    """
    return os.getenv("ENVIRONMENT", "development").lower()


def should_use_sqs() -> bool:
    """Determine if SQS should be used based on environment.

    Returns:
        True if SQS should be used, False otherwise
    """
    # For development, we might want to make SQS optional
    # For production, it should always be enabled
    env_type = get_environment_type()

    if env_type == "production":
        return True

    # Check if explicitly enabled/disabled
    use_sqs = os.getenv("USE_SQS", "true").lower()
    return use_sqs in ("true", "1", "yes", "on")


def get_queue_name_with_env_prefix(base_name: str) -> str:
    """Get queue name with environment prefix.

    Args:
        base_name: Base queue name

    Returns:
        Queue name with environment prefix
    """
    env_type = get_environment_type()
    env_prefix = os.getenv("AWS_QUEUE_PREFIX", f"nsp-{env_type}")

    return f"{env_prefix}-{base_name}"
