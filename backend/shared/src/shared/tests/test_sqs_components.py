"""Test SQS components to ensure they work correctly."""

from unittest.mock import Mock, patch

from shared.aws.config import AWSConfig
from shared.aws.sqs_client import SQSClient
from shared.schemas.core.solve_task_status import SQSSolveMessage


def test_aws_config_creation():
    """Test AWS configuration creation."""
    config = AWSConfig(
        region="eu-west-3",
        aws_access_key_id="test_access_key",
        aws_secret_access_key="test_secret_key",
        sqs_solve_queue_url=(
            "http://localhost:4566/000000000000/nsp-pro-dev-solve-queue"
        ),
        documentdb_secret_name="test-documentdb-secret",
    )
    assert config.region == "eu-west-3"
    assert (
        config.sqs_solve_queue_url
        == "http://localhost:4566/000000000000/nsp-pro-dev-solve-queue"
    )


def test_sqs_message_creation():
    """Test SQS message schema creation."""
    message = SQSSolveMessage(
        schedule_id="test-schedule-123",
        team_id="test-team-456",
        user_id="test-user-789",
    )

    assert message.schedule_id == "test-schedule-123"
    assert message.team_id == "test-team-456"
    assert message.user_id == "test-user-789"
    assert message.timeout_seconds == 300


@patch("shared.aws.sqs_client.boto3")
def test_sqs_client_initialization(mock_boto3):
    """Test SQS client initialization."""
    mock_sqs = Mock()
    mock_boto3.client.return_value = mock_sqs

    config = AWSConfig(
        region="eu-west-3",
        aws_access_key_id="test_access_key",
        aws_secret_access_key="test_secret_key",
        sqs_solve_queue_url=(
            "http://localhost:4566/000000000000/nsp-pro-dev-solve-queue"
        ),
        documentdb_secret_name="test-documentdb-secret",
    )
    client = SQSClient(config)

    # Test that SQS client is created when accessed
    sqs = client.sqs
    assert sqs is mock_sqs

    mock_boto3.client.assert_called_once_with(
        "sqs",
        region_name=config.region,
        aws_access_key_id=config.aws_access_key_id,
        aws_secret_access_key=config.aws_secret_access_key,
        aws_session_token=None,
        endpoint_url=None,
    )


if __name__ == "__main__":
    # Run basic tests
    test_aws_config_creation()
    test_sqs_message_creation()
    print("✅ All basic tests passed!")
