"""
Service authentication module for validating API Gateway requests.
Implements secure service-to-service authentication using API keys.
"""

import logging
import os
from functools import lru_cache
from typing import Optional

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)


class ServiceAuthError(Exception):
    """Custom exception for service authentication errors"""


@lru_cache(maxsize=1)
def get_ssm_client():
    """
    Get SSM client for retrieving API key.
    Cached to avoid creating multiple clients.
    """
    try:
        region = os.getenv("AWS_REGION", "eu-west-3")
        return boto3.client(
            "ssm", region_name=region, endpoint_url="http://localhost:4566"
        )
    except NoCredentialsError as exc:
        logger.error("AWS credentials not configured")
        raise ServiceAuthError("AWS credentials not configured") from exc
    except Exception as e:
        logger.error("Failed to create SSM client: %s", e)
        raise ServiceAuthError("Failed to initialize AWS client") from e


@lru_cache(maxsize=1)
def get_expected_api_key() -> str:
    """
    Retrieve the expected API key from SSM Parameter Store.
    Cached to avoid repeated AWS API calls during request processing.
    """
    try:
        ssm = get_ssm_client()
        project_name = os.getenv("PROJECT_NAME", "nsp-pro")
        environment = os.getenv("ENVIRONMENT", "local")
        parameter_name = f"/{project_name}/{environment}/backend-api-key"

        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        api_key = response["Parameter"]["Value"]

        if not api_key:
            raise ServiceAuthError("Empty API key retrieved from SSM")

        return api_key
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ParameterNotFound":
            logger.error("API key parameter not found: %s", parameter_name)
            raise ServiceAuthError(
                "Service authentication not configured"
            ) from e
        logger.error("AWS SSM error: %s", e)
        raise ServiceAuthError(
            "Failed to retrieve service configuration"
        ) from e
    except Exception as e:
        logger.error("Failed to retrieve API key from SSM: %s", e)
        raise ServiceAuthError("Service configuration error") from e


def validate_service_api_key(provided_key: Optional[str]) -> bool:
    """
    Validate the provided API key against the expected one.

    Args:
        provided_key: The API key provided in the request header

    Returns:
        bool: True if valid, False otherwise

    Raises:
        ServiceAuthError: If there are configuration issues
    """
    if not provided_key:
        logger.warning("Missing API key in request")
        return False

    try:
        expected_key = get_expected_api_key()
        is_valid = provided_key == expected_key

        if not is_valid:
            logger.warning("Invalid API key provided")

        return is_valid
    except ServiceAuthError:
        # Re-raise service auth errors
        raise
    except Exception as e:
        logger.error("Unexpected error during API key validation: %s", e)
        raise ServiceAuthError(
            "Service authentication validation failed"
        ) from e
