import json
import logging
import os
from typing import Any, Dict

import urllib3

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# HTTP client
http = urllib3.PoolManager()


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Cognito Post-Confirmation Lambda Trigger

    This function is triggered after a user confirms their account.
    It sends user data to the backend API for onboarding.
    """

    try:
        logger.info(
            f"Post-confirmation trigger called for user: {event.get('userName', 'unknown')}"
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
            logger.error(f"Missing required fields: {missing_fields}")
            raise ValueError(
                f"Missing required user attributes: {missing_fields}"
            )

        # Get environment variables
        api_endpoint = os.environ.get("API_ENDPOINT_URL")
        api_key = os.environ.get("BACKEND_API_KEY")

        if not api_endpoint or not api_key:
            logger.error("Missing required environment variables")
            raise ValueError(
                "API_ENDPOINT_URL and BACKEND_API_KEY must be set"
            )

        # Prepare headers
        headers = {"Content-Type": "application/json", "X-API-Key": api_key}

        # Send request to backend API
        logger.info(f"Sending onboard request to: {api_endpoint}")

        response = http.request(
            "POST",
            api_endpoint,
            body=json.dumps(payload),
            headers=headers,
            timeout=10.0,
        )

        # Check response status
        if response.status == 200:
            logger.info(f"User {payload['user_id']} onboarded successfully")
        else:
            logger.error(
                f"API request failed with status {response.status}: {response.data.decode('utf-8')}"
            )
            # Don't raise exception here to avoid blocking user confirmation
            # The user should still be able to confirm their account

    except Exception as e:
        logger.error(f"Error in post-confirmation trigger: {str(e)}")
        # Important: Don't raise exceptions that would block user confirmation
        # Log the error but return the event to allow user registration to proceed

    # Always return the event to Cognito
    return event
