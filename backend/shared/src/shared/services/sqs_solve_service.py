"""SQS-based solve service for NSP Pro."""

from datetime import datetime, timezone
from typing import Any, Dict, List

from loguru import logger

from ..aws.sqs_client import SQSClient
from ..schemas.core.solve_task_status import (
    SQSSolveMessage,
    SQSSolveQueueMessage,
)


class SQSSolveService:
    """Service for managing solve requests via SQS."""

    def __init__(self, sqs_client: SQSClient):
        """Initialize the SQS solve service.

        Args:
            sqs_client: SQS client instance
        """
        self.sqs_client = sqs_client

    async def submit_solve_request(
        self,
        schedule_id: str,
        team_id: str,
        user_id: str,
        timeout_seconds: int = 300,
    ) -> str:
        """Submit a solve request to SQS.

        Args:
            schedule_id: ID of the schedule to solve
            team_id: Team ID for authorization
            user_id: User ID who initiated the request
            timeout_seconds: Timeout for solve operation

        Returns:
            SQS message ID

        Raises:
            Exception: If submitting the request fails
        """
        # Create SQS message
        message = SQSSolveMessage(
            schedule_id=schedule_id,
            team_id=team_id,
            user_id=user_id,
            timeout_seconds=timeout_seconds,
            created_at=datetime.now(timezone.utc),
        )

        try:
            # Send to SQS with priority-based delay
            message_id = await self.sqs_client.send_solve_message(
                message_body=message.to_dict(),
            )

            logger.info(
                f"Solve request submitted: {message_id} for schedule "
                f"{schedule_id} by user {user_id}"
            )
            return message_id

        except Exception as e:
            logger.error(
                f"Failed to submit solve request for schedule " f"{schedule_id}: {e}"
            )
            raise

    async def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status.

        Returns:
            Dictionary with queue statistics

        Raises:
            Exception: If getting queue status fails
        """
        try:
            attributes = await self.sqs_client.get_queue_attributes()

            return {
                "messages_available": int(
                    attributes.get("ApproximateNumberOfMessages", "0")
                ),
                "messages_in_flight": int(
                    attributes.get("ApproximateNumberOfMessagesNotVisible", "0")
                ),
                "messages_delayed": int(
                    attributes.get("ApproximateNumberOfMessagesDelayed", "0")
                ),
                "queue_url": self.sqs_client.solve_queue_url,
                "dlq_url": self.sqs_client.dlq_url,
            }

        except Exception as e:
            logger.error(f"Failed to get queue status: {e}")
            raise

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on SQS service.

        Returns:
            Health check result
        """
        try:
            queue_status = await self.get_queue_status()

            return {
                "status": "healthy",
                "queue_status": queue_status,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"SQS health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def receive_solve_requests(
        self, max_messages: int = 1, wait_time_seconds: int = 20
    ) -> List[SQSSolveQueueMessage]:
        """Receive solve requests from SQS queue.

        Args:
            max_messages: Maximum number of messages to receive (1-10)
            wait_time_seconds: Long polling wait time in seconds (0-20)

        Returns:
            List of dictionaries containing:
            - message: SolveRequestMessage object
            - receipt_handle: Handle for message deletion
            - message_id: SQS message ID

        Raises:
            Exception: If receiving messages fails
        """
        try:
            # Validate parameters
            max_messages = max(1, min(10, max_messages))
            wait_time_seconds = max(0, min(20, wait_time_seconds))

            # Receive messages from SQS
            raw_messages = await self.sqs_client.receive_messages(
                max_messages=max_messages, wait_time_seconds=wait_time_seconds
            )

            processed_messages: List[SQSSolveQueueMessage] = []

            for raw_message in raw_messages:
                try:
                    # Parse message body
                    message_body = raw_message.get("Body", "{}")

                    # Convert to SolveRequestMessage
                    message_content = SQSSolveMessage.from_json(message_body)

                    processed_messages.append(
                        SQSSolveQueueMessage(
                            message=message_content,
                            receipt_handle=raw_message["ReceiptHandle"],
                            message_id=raw_message["MessageId"],
                        )
                    )

                    logger.debug(
                        f"Received solve request for schedule "
                        f"{message_content.schedule_id}"
                    )

                except Exception as e:
                    logger.error(
                        "Failed to parse SQS message "
                        + f"{raw_message.get('MessageId', 'unknown')}: {e}"
                    )
                    # Skip malformed messages - they'll be retried or go to DLQ
                    continue

            logger.debug(f"Received {len(processed_messages)} solve requests from SQS")
            return processed_messages

        except Exception as e:
            logger.error(f"Failed to receive solve requests from SQS: {e}")
            raise

    async def delete_message(self, receipt_handle: str) -> None:
        """Delete a message from the SQS queue.

        Args:
            receipt_handle: Receipt handle of the message to delete

        Raises:
            Exception: If deleting the message fails
        """
        try:
            await self.sqs_client.delete_message(receipt_handle)
            logger.debug(f"Deleted message with receipt handle: {receipt_handle}")

        except Exception as e:
            logger.error(f"Failed to delete SQS message: {e}")
            raise
