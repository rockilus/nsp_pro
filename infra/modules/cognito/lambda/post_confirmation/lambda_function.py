import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict

import boto3
import urllib3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# HTTP client
http = urllib3.PoolManager()


@lru_cache(maxsize=1)
def get_backend_api_key() -> str:
    """
    Retrieve the backend API key from SSM Parameter Store.
    Cached to avoid repeated AWS API calls.
    """
    try:
        region = os.environ.get("AWS_REGION", "eu-west-3")
        ssm = boto3.client("ssm", region_name=region)

        # project_name = os.environ.get("PROJECT_NAME", "rockilus")
        # environment = os.environ.get("ENVIRONMENT", "prod")
        # parameter_name = f"/{project_name}/{environment}/backend-api-key"
        parameter_name = "/rockilus/prod/backend-api-key"

        logger.info("Retrieving API key from SSM: %s", parameter_name)

        response = ssm.get_parameter(Name=parameter_name, WithDecryption=True)
        api_key = response["Parameter"]["Value"]

        if not api_key:
            raise ValueError("Empty API key retrieved from SSM")

        logger.info("API key retrieved successfully from SSM")
        return api_key

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ParameterNotFound":
            logger.error("API key parameter not found: %s", parameter_name)
            raise ValueError(
                f"API key parameter not found: {parameter_name}"
            ) from e
        logger.error("AWS SSM error: %s", e)
        raise ValueError(f"Failed to retrieve API key from SSM: {e}") from e
    except Exception as e:
        logger.error("Failed to retrieve API key from SSM: %s", e)
        raise ValueError(f"Service configuration error: {e}") from e


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Cognito Post-Confirmation Lambda Trigger

    This function is triggered after a user confirms their account.
    It sends user data to the backend API for onboarding.
    """

    try:
        logger.info(
            "Post-confirmation trigger called for user: %s",
            event.get("userName", "unknown"),
        )

        # Extract user attributes from Cognito event
        user_attributes = event.get("request", {}).get("userAttributes", {})

        # Prepare payload for the backend API
        payload = {
            "user_id": user_attributes.get("sub"),  # Cognito user ID
            "email": user_attributes.get("email"),
            "username": event.get("userName"),
            "first_name": user_attributes.get("given_name"),
            "last_name": user_attributes.get("family_name"),
        }

        # Validate required fields
        required_fields = ["user_id", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not payload.get(field)
        ]

        if missing_fields:
            logger.error("Missing required fields: %s", missing_fields)
            raise ValueError(
                f"Missing required user attributes: {missing_fields}"
            )

        # Get environment variables
        # api_endpoint = os.environ.get("API_ENDPOINT_URL")
        api_endpoint = (
            "https://api.rockilus.com/users/onboard"  # Hardcoded for now
        )

        if not api_endpoint:
            logger.error(
                "Missing required environment variable: API_ENDPOINT_URL"
            )
            raise ValueError("API_ENDPOINT_URL must be set")

        # Get API key from SSM Parameter Store
        try:
            api_key = get_backend_api_key()
        except Exception as e:
            logger.error("Failed to retrieve API key: %s", str(e))
            # Don't block user confirmation, but log the error
            return event

        # Prepare headers
        headers = {"Content-Type": "application/json", "X-API-Key": api_key}

        # Send request to backend API
        logger.info("Sending onboard request to: %s", api_endpoint)

        response = http.request(
            "POST",
            api_endpoint,
            body=json.dumps(payload),
            headers=headers,
            timeout=10.0,
        )

        # Check response status
        if response.status == 200:
            logger.info("User %s onboarded successfully", payload["user_id"])
        else:
            logger.error(
                "API request failed with status %s: %s",
                response.status,
                response.data.decode("utf-8"),
            )
            # Don't raise exception here to avoid blocking user confirmation
            # The user should still be able to confirm their account

    except Exception as e:
        logger.error("Error in post-confirmation trigger: %s", str(e))
        # Important: Don't raise exceptions that would block user confirmation
        # Log the error but return the event to allow user registration to proceed

    # Always return the event to Cognito
    return event
