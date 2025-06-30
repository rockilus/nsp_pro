"""Test SQS components to ensure they work correctly."""

from unittest.mock import Mock, patch

from shared.aws.config import AWSConfig
from shared.aws.sqs_client import SQSClient
from shared.schemas.sqs_messages import (
    SolveRequestPriority,
    SolveRequestType,
    SQSSolveMessage,
)
from shared.services.sqs_solve_service import SQSSolveService


def test_aws_config_creation():
    """Test AWS configuration creation."""
    config = AWSConfig()
    assert config.region == "us-east-1"
    assert config.sqs_solve_queue_name == "nsp-solve-queue"
    assert config.sqs_solve_dlq_name == "nsp-solve-dlq"


def test_sqs_message_creation():
    """Test SQS message schema creation."""
    message = SQSSolveMessage(
        schedule_id="test-schedule-123",
        team_id="test-team-456",
        user_id="test-user-789",
        request_type=SolveRequestType.FULL_SOLVE,
        priority=SolveRequestPriority.NORMAL,
    )

    assert message.schedule_id == "test-schedule-123"
    assert message.team_id == "test-team-456"
    assert message.user_id == "test-user-789"
    assert message.request_type == SolveRequestType.FULL_SOLVE
    assert message.priority == SolveRequestPriority.NORMAL
    assert message.timeout_seconds == 300
    assert message.constraints is None


@patch("shared.aws.sqs_client.boto3")
def test_sqs_client_initialization(mock_boto3):
    """Test SQS client initialization."""
    mock_sqs = Mock()
    mock_boto3.Session.return_value.client.return_value = mock_sqs

    config = AWSConfig()
    client = SQSClient(config)

    # Test that SQS client is created when accessed
    sqs = client.sqs
    assert sqs is mock_sqs

    mock_boto3.Session.assert_called_once_with(
        aws_access_key_id=None,
        aws_secret_access_key=None,
        region_name="us-east-1",
    )


def test_sqs_solve_service_priority_delay():
    """Test that solve service calculates correct delays for priorities."""
    mock_sqs_client = Mock()
    service = SQSSolveService(mock_sqs_client)

    # Test delay calculation for different priorities
    assert service._get_delay_by_priority(SolveRequestPriority.URGENT) == 0
    assert service._get_delay_by_priority(SolveRequestPriority.HIGH) == 0
    assert service._get_delay_by_priority(SolveRequestPriority.NORMAL) == 10
    assert service._get_delay_by_priority(SolveRequestPriority.LOW) == 60


if __name__ == "__main__":
    # Run basic tests
    test_aws_config_creation()
    test_sqs_message_creation()
    test_sqs_solve_service_priority_delay()
    print("✅ All basic tests passed!")
