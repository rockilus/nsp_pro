"""SQS-based solve service for NSP Pro."""

from datetime import datetime, timezone
from typing import Any, Dict

from loguru import logger

from ..aws.sqs_client import SQSClient
from ..schemas.core.sqs_messages import SQSSolveMessage


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
            request_type: Type of solve request
            priority: Priority of the request
            constraints: Additional constraints for solving
            metadata: Additional metadata
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
