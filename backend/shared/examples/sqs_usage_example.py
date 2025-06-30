"""Example usage of SQS components for NSP Pro solve service."""

import asyncio
import os
from datetime import datetime

from shared import (
    AWSConfig,
    SQSClient,
    SQSSolveService,
    SolveRequestPriority,
    SolveRequestType,
    create_sqs_solve_service,
)


async def example_basic_usage():
    """Example of basic SQS solve service usage."""
    print("🚀 Starting SQS Solve Service Example")

    # Method 1: Manual configuration
    config = AWSConfig(
        region="us-east-1",
        sqs_solve_queue_name="nsp-dev-solve-queue",
        sqs_solve_dlq_name="nsp-dev-solve-dlq",
    )

    sqs_client = SQSClient(config)
    solve_service = SQSSolveService(sqs_client)

    print("✅ Created SQS solve service manually")

    # Method 2: Using factory function (recommended)
    try:
        solve_service_2 = await create_sqs_solve_service()
        print("✅ Created SQS solve service using factory")
    except Exception as e:
        print(f"⚠️ Factory creation failed (expected in dev): {e}")
        solve_service_2 = solve_service  # Use manual service for demo

    # Example: Submit a solve request
    try:
        message_id = await solve_service_2.submit_solve_request(
            schedule_id="schedule_123",
            team_id="team_456",
            user_id="user_789",
            request_type=SolveRequestType.FULL_SOLVE,
            priority=SolveRequestPriority.HIGH,
            constraints={"max_consecutive_shifts": 5, "min_rest_hours": 12},
            metadata={
                "source": "web_ui",
                "timestamp": datetime.utcnow().isoformat(),
            },
            timeout_seconds=600,
        )
        print(f"✅ Successfully submitted solve request: {message_id}")

    except Exception as e:
        print(f"⚠️ Failed to submit solve request (expected in dev): {e}")

    # Example: Check queue status
    try:
        status = await solve_service_2.get_queue_status()
        print(f"📊 Queue Status: {status}")

    except Exception as e:
        print(f"⚠️ Failed to get queue status (expected in dev): {e}")

    # Example: Health check
    health = await solve_service_2.health_check()
    print(f"🏥 Health Check: {health}")


async def example_with_environment_config():
    """Example using environment variables for configuration."""
    print("\n🌍 Environment Configuration Example")

    # Set some example environment variables
    os.environ["AWS_REGION"] = "us-west-2"
    os.environ["AWS_SQS_SOLVE_QUEUE_NAME"] = "my-custom-solve-queue"
    os.environ["AWS_SQS_VISIBILITY_TIMEOUT_SECONDS"] = "1800"  # 30 minutes

    try:
        # This will use environment variables
        solve_service = await create_sqs_solve_service()

        # Check the configuration was loaded
        config = solve_service.sqs_client.config
        print("✅ Loaded config from environment:")
        print(f"   Region: {config.region}")
        print(f"   Queue: {config.sqs_solve_queue_name}")
        print(f"   Timeout: {config.sqs_visibility_timeout_seconds}")

    except Exception as e:
        print(f"⚠️ Environment config failed (expected in dev): {e}")


def example_message_priorities():
    """Example showing different message priorities and their delays."""
    print("\n⏱️  Message Priority Examples")

    sqs_client = SQSClient()  # Mock client for demo
    solve_service = SQSSolveService(sqs_client)

    priorities = [
        SolveRequestPriority.URGENT,
        SolveRequestPriority.HIGH,
        SolveRequestPriority.NORMAL,
        SolveRequestPriority.LOW,
    ]

    for priority in priorities:
        delay = solve_service._get_delay_by_priority(priority)
        print(f"   {priority.value.upper()}: {delay} seconds delay")


async def main():
    """Run all examples."""
    print("🏥 NSP Pro SQS Solve Service Examples\n")

    await example_basic_usage()
    await example_with_environment_config()
    example_message_priorities()

    print("\n✨ Examples completed!")


if __name__ == "__main__":
    asyncio.run(main())
