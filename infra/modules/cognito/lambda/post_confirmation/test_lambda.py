#!/usr/bin/env python3
"""
Test script to validate the Lambda function implementation.
This can be used to test the Lambda function locally or in development.
"""

import json
import os
from unittest.mock import patch, MagicMock

# Mock environment variables
os.environ["AWS_REGION"] = "eu-west-3"
os.environ["ENVIRONMENT"] = "dev"
os.environ["API_GATEWAY_URL"] = "https://api.rockilus.com"

# Sample Cognito post-confirmation event
SAMPLE_EVENT = {
    "version": "1",
    "region": "eu-west-3",
    "userPoolId": "eu-west-3_example123",
    "userName": "test_user_123",
    "callerContext": {
        "awsRequestId": "12345678-1234-1234-1234-123456789012",
        "client": "2abcdefghijklmnopqrstuvwxyz",
    },
    "triggerSource": "PostConfirmation_ConfirmSignUp",
    "request": {
        "userAttributes": {
            "sub": "12345678-1234-1234-1234-123456789012",
            "email_verified": "true",
            "email": "test@example.com",
            "given_name": "John",
            "family_name": "Doe",
        }
    },
    "response": {},
}


def test_lambda_function():
    """Test the Lambda function with mocked dependencies."""

    # Mock SSM responses
    mock_ssm_client = MagicMock()
    mock_ssm_client.get_parameter.return_value = {
        "Parameter": {"Value": "test-internal-api-key-123"}
    }

    # Mock HTTP response
    mock_http_response = MagicMock()
    mock_http_response.status = 200
    mock_http_response.data.decode.return_value = json.dumps(
        {
            "status": "success",
            "message": "User onboarded successfully",
            "user_id": "12345678-1234-1234-1234-123456789012",
        }
    )

    with patch(
        "lambda_function.get_ssm_client", return_value=mock_ssm_client
    ), patch("lambda_function.http") as mock_http:

        mock_http.request.return_value = mock_http_response

        # Import and test the lambda function
        from lambda_function import lambda_handler

        result = lambda_handler(SAMPLE_EVENT, None)

        # Verify the function returns the original event
        assert result == SAMPLE_EVENT

        # Verify SSM was called for internal API key
        mock_ssm_client.get_parameter.assert_called_with(
            Name="/dev/nsp-pro/internal/api-key", WithDecryption=True
        )

        # Verify HTTP request was made to internal endpoint
        mock_http.request.assert_called_once()
        call_args = mock_http.request.call_args

        assert call_args[0][0] == "POST"  # HTTP method
        assert (
            "/internal/onboard" in call_args[0][1]
        )  # URL contains internal path

        # Verify request payload
        request_body = json.loads(call_args[1]["body"])
        assert (
            request_body["user_id"] == "12345678-1234-1234-1234-123456789012"
        )
        assert request_body["email"] == "test@example.com"
        assert request_body["first_name"] == "John"
        assert request_body["last_name"] == "Doe"

        # Verify headers
        headers = call_args[1]["headers"]
        assert headers["Content-Type"] == "application/json"
        assert headers["X-API-Key"] == "test-internal-api-key-123"

        print("✅ All tests passed!")
        return True


def test_invalid_event():
    """Test the Lambda function with an invalid event."""

    invalid_event = {
        "triggerSource": "InvalidTriggerSource",  # Wrong trigger source
        "request": {},
    }

    from lambda_function import lambda_handler

    result = lambda_handler(invalid_event, None)

    # Function should return the event even with invalid input
    assert result == invalid_event
    print("✅ Invalid event test passed!")
    return True


if __name__ == "__main__":
    print("🧪 Testing Lambda function implementation...")
    print()

    # Test valid event
    print("Testing valid Cognito event...")
    test_lambda_function()
    print()

    # Test invalid event
    print("Testing invalid event handling...")
    test_invalid_event()
    print()

    print("🎉 All tests completed successfully!")
    print()
    print("Next steps:")
    print("1. Deploy the updated infrastructure with Terraform")
    print("2. Test the end-to-end flow with a real user signup")
    print("3. Monitor CloudWatch logs for any issues")
