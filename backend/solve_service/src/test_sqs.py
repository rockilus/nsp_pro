#!/usr/bin/env python3
"""
Simple script to test SQS integration in the solve service.

This script demonstrates how to use the new SQS consumer and can be used
for testing and development purposes.
"""
import asyncio
import sys

from bson import ObjectId
from loguru import logger
from shared.schemas.core import (
    SQSSolveMessage,
)
from shared.services.factory import create_sqs_solve_service

from sqs_consumer import create_sqs_consumer


async def test_send_message():
    """
    Test sending a message to the SQS queue.
    """
    logger.info("Testing SQS message sending...")

    try:
        # Create SQS service
        sqs_service = await create_sqs_solve_service()

        # Create a test message
        test_message = SQSSolveMessage(
            team_id=str(ObjectId()),
            schedule_id=str(ObjectId()),
            user_id=str(ObjectId()),
        )

        # Send the message
        message_id = await sqs_service.submit_solve_request(
            schedule_id=test_message.schedule_id,
            team_id=test_message.team_id,
            user_id=test_message.user_id,
        )
        logger.info(f"Successfully sent test message with ID: {message_id}")

        return message_id

    except Exception as e:
        logger.error(f"Failed to send test message: {e}")
        return None


async def test_consume_messages():
    """
    Test consuming messages from the SQS queue.
    """
    logger.info("Testing SQS message consumption...")

    try:
        # Create consumer
        consumer = await create_sqs_consumer()

        # Start consuming for a limited time
        consume_task = asyncio.create_task(consumer.start_consuming())

        # Let it run for 30 seconds
        await asyncio.sleep(30)

        # Stop the consumer
        consumer.stop_consuming()
        await consume_task

        logger.info("Message consumption test completed")

    except Exception as e:
        logger.error(f"Failed to consume messages: {e}")


async def test_end_to_end():
    """
    Test the complete flow: send a message and consume it.
    """
    logger.info("Starting end-to-end SQS test...")

    # Send a test message
    message_id = await test_send_message()

    if not message_id:
        logger.error("Failed to send test message, aborting test")
        return

    # Wait a bit for the message to be available
    await asyncio.sleep(2)

    # Consume messages
    await test_consume_messages()

    logger.info("End-to-end test completed")


async def main():
    """
    Main test function.
    """
    if len(sys.argv) < 2:
        print("Usage: python test_sqs.py [send|consume|e2e]")
        sys.exit(1)

    test_type = sys.argv[1].lower()

    if test_type == "send":
        await test_send_message()
    elif test_type == "consume":
        await test_consume_messages()
    elif test_type == "e2e":
        await test_end_to_end()
    else:
        print("Invalid test type. Use: send, consume, or e2e")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
