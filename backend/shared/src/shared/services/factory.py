"""Factory functions for creating SQS services."""

from typing import Optional

from ..aws import (
    AWSConfig,
    SQSClient,
    get_aws_config_from_env,
    validate_aws_config,
)
from .sqs_solve_service import SQSSolveService


async def create_sqs_solve_service(
    config: Optional[AWSConfig] = None,
) -> SQSSolveService:
    """Create and initialize an SQS solve service.

    Args:
        config: AWS configuration. If None, uses environment variables.

    Returns:
        Initialized SQSSolveService instance

    Raises:
        ValueError: If configuration is invalid
        Exception: If SQS initialization fails
    """
    if config is None:
        config = get_aws_config_from_env()

    if not validate_aws_config(config):
        raise ValueError("Invalid AWS configuration")

    # Create SQS client
    sqs_client = SQSClient(config)

    # Create solve service
    return SQSSolveService(sqs_client=sqs_client, queue_url=config.sqs_solve_queue_url)


def create_sqs_client(config: Optional[AWSConfig] = None) -> SQSClient:
    """Create an SQS client.

    Args:
        config: AWS configuration. If None, uses environment variables.

    Returns:
        SQSClient instance

    Raises:
        ValueError: If configuration is invalid
    """
    if config is None:
        config = get_aws_config_from_env()

    if not validate_aws_config(config):
        raise ValueError("Invalid AWS configuration")

    return SQSClient(config)
