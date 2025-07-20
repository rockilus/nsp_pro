import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, Optional

import boto3
import urllib3
from botocore.exceptions import ClientError

# Configure logging following NSP Pro standards
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# HTTP client with connection pooling
http = urllib3.PoolManager(
    timeout=urllib3.Timeout(connect=5.0, read=10.0),
    retries=urllib3.Retry(
        total=3, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504]
    ),
)


@lru_cache(maxsize=1)
def get_ssm_client():
    """
    Get SSM client with proper region configuration.
    Cached to avoid creating multiple clients.
    """
    region = os.environ.get("REGION", "eu-west-3")
    return boto3.client("ssm", region_name=region)


@lru_cache(maxsize=1)
def get_internal_api_key() -> Optional[str]:
    """
    Retrieve the internal API key from SSM Parameter Store.
    This key is used for Lambda to API Gateway communication.
    """
    try:
        ssm = get_ssm_client()
        project_name = os.environ.get("PROJECT_NAME", "rockilus")
        environment = os.environ.get("ENVIRONMENT", "prod")
        param_name = f"/{project_name}/{environment}/internal-api-key"

        response = ssm.get_parameter(Name=param_name, WithDecryption=True)
        api_key = response.get("Parameter", {}).get("Value")
        if not api_key:
            logger.error("Internal API key not found in SSM parameter")
            return None
        return api_key
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.error(
            "Failed to retrieve internal API key from SSM: %s - %s",
            error_code,
            str(e),
        )
        return None


def validate_cognito_event(event: Dict[str, Any]) -> bool:
    """
    Validate that the event is a proper Cognito post-confirmation event.
    """
    required_fields = ["triggerSource", "userPoolId", "request", "response"]

    if not all(field in event for field in required_fields):
        logger.error("Missing required fields in Cognito event")
        return False

    if event["triggerSource"] != "PostConfirmation_ConfirmSignUp":
        logger.error("Invalid trigger source: %s", event.get("triggerSource"))
        return False

    user_attributes = event.get("request", {}).get("userAttributes", {})
    if not user_attributes.get("email"):
        logger.error("User email not found in event")
        return False

    return True


# pylint: disable=unused-argument
def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Cognito Post-Confirmation Lambda Trigger

    This function is triggered after a user confirms their account.
    It sends user data to the backend API via internal API Gateway endpoint.
    """

    try:
        logger.info(
            "Post-confirmation trigger called for user: %s",
            event.get("userName", "unknown"),
        )

        # Validate the Cognito event
        if not validate_cognito_event(event):
            logger.error("Invalid Cognito event structure")
            return event

        # Extract user attributes from Cognito event
        user_attributes = event.get("request", {}).get("userAttributes", {})

        # Prepare payload for the backend API
        payload = {
            "user_id": user_attributes.get("sub"),  # Cognito user ID
            "email": user_attributes.get("email"),
            "username": event.get("userName"),
            "first_name": user_attributes.get("given_name"),
            "last_name": user_attributes.get("family_name"),
            # "cognito_user_pool_id": event.get("userPoolId"),
        }

        # Validate required fields
        required_fields = ["user_id", "email", "first_name", "last_name"]
        missing_fields = [
            field for field in required_fields if not payload.get(field)
        ]

        if missing_fields:
            logger.error("Missing required fields: %s", missing_fields)
            # Log but don't block user confirmation
            return event

        # Get internal API Gateway endpoint
        api_base_url = os.environ.get(
            "API_BASE_URL", "https://api.rockilus.com"
        )
        internal_endpoint = f"{api_base_url}/internal/onboard"

        # Get internal API key for Lambda -> API Gateway auth
        internal_api_key = get_internal_api_key()
        if not internal_api_key:
            logger.error("Failed to retrieve internal API key")
            return event

        # Prepare headers for internal API Gateway call
        headers = {
            "Content-Type": "application/json",
            "X-API-Key": internal_api_key,
        }

        # Send request to internal API Gateway endpoint
        logger.info("Sending onboard request to: %s", internal_endpoint)

        response = http.request(
            "POST",
            internal_endpoint,
            body=json.dumps(payload),
            headers=headers,
            timeout=10.0,
        )

        # Check response status
        if response.status == 200:
            logger.info(
                "User %s onboarded successfully via internal API",
                payload["user_id"],
            )
            try:
                response_data = json.loads(response.data.decode("utf-8"))
                logger.info("Onboard response: %s", response_data)
            except json.JSONDecodeError:
                logger.warning("Could not parse onboard response")
        else:
            logger.error(
                "Internal API request failed with status %s: %s",
                response.status,
                response.data.decode("utf-8"),
            )

    except Exception as e:  # pylint: disable=broad-except
        logger.error("Error in post-confirmation trigger: %s", str(e))
        # Important: Don't raise exceptions that would block user confirmation
        # Log error but return event to allow user registration to proceed

    # Always return the event to Cognito
    return event
