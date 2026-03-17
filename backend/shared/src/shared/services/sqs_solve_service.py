"""SQS-based solve service for NSP Pro."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from loguru import logger

from ..schemas.core.solve_task_status import (
    SolveScope,
    SQSSolveMessage,
    SQSSolveQueueMessage,
)
from .queue_service import QueueService

# pylint: disable=too-many-arguments


class SQSSolveService(QueueService[SQSSolveMessage, SQSSolveQueueMessage]):
    """Service for managing solve requests via SQS."""

    def _serialize_message(self, message: SQSSolveMessage) -> Dict[str, Any]:
        """Serialize a solve message to a dictionary.

        Args:
            message: Solve message to serialize

        Returns:
            Dictionary representation
        """
        return message.to_dict()

    def _deserialize_message(self, raw_message: Dict[str, Any]) -> SQSSolveQueueMessage:
        """Deserialize an SQS message to a solve queue message.

        Args:
            raw_message: Raw message from SQS

        Returns:
            Solve queue message object
        """
        message_body = raw_message.get("Body", "{}")
        message_content = SQSSolveMessage.from_json(message_body)

        return SQSSolveQueueMessage(
            message=message_content,
            receipt_handle=raw_message["ReceiptHandle"],
            message_id=raw_message["MessageId"],
        )

    async def submit_solve_request(
        self,
        schedule_id: str,
        team_id: str,
        user_id: str,
        timeout_seconds: int = 300,
        solve_scope: Optional[SolveScope] = None,
    ) -> str:
        """Submit a solve request to SQS.

        Args:
            schedule_id: ID of the schedule to solve
            team_id: Team ID for authorization
            user_id: User ID who initiated the request
            timeout_seconds: Timeout for solve operation
            solve_scope: Optional scope for partial campaign solve

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
            solve_scope=solve_scope,
        )

        message_attributes = {
            "ScheduleId": {
                "StringValue": schedule_id,
                "DataType": "String",
            },
        }

        message_id = await self.send_message(
            message=message, message_attributes=message_attributes
        )

        logger.info(
            f"Solve request submitted: {message_id} for schedule "
            f"{schedule_id} by user {user_id}"
        )
        return message_id

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

        except (ValueError, KeyError) as e:
            logger.error(f"SQS health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
