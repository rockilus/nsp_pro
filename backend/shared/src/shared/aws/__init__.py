"""AWS integration module for NSP Pro."""

from .config import AWSConfig
from .exceptions import (
    AWSServiceError,
    DocumentDBCredentialsError,
    SecretsManagerError,
)
from .secrets_manager import DocumentDBCredentials, SecretsManager
from .sqs_client import SQSClient
from .utils import (
    get_aws_config_from_env,
    get_environment_type,
    get_queue_name_with_env_prefix,
    should_use_sqs,
    validate_aws_config,
)

__all__ = [
    "AWSConfig",
    "SecretsManager",
    "DocumentDBCredentials",
    "AWSServiceError",
    "SecretsManagerError",
    "DocumentDBCredentialsError",
    "SQSClient",
    "get_aws_config_from_env",
    "validate_aws_config",
    "get_environment_type",
    "should_use_sqs",
    "get_queue_name_with_env_prefix",
]
