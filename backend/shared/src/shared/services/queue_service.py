"""Base queue service for NSP Pro."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, TypeVar

from loguru import logger

from ..aws.sqs_client import SQSClient

# Type variable for message types
TMessage = TypeVar("TMessage")
TQueueMessage = TypeVar("TQueueMessage")


class QueueService(ABC, Generic[TMessage, TQueueMessage]):
    """Base service for managing queue operations with type-safe serialization.

    This abstract base class provides common queue operations
    (send, receive, delete) and requires subclasses to implement
    domain-specific message serialization.

    Type Parameters:
        TMessage: The domain message type to send
        TQueueMessage: The queue message type to receive
    """

    def __init__(self, sqs_client: SQSClient, queue_url: str):
        """Initialize the queue service.

        Args:
            sqs_client: SQS client instance
            queue_url: URL of the queue to operate on
        """
        self.sqs_client = sqs_client
        self.queue_url = queue_url

    @abstractmethod
    def _serialize_message(self, message: TMessage) -> Dict[str, Any]:
        """Serialize a domain message to a dictionary for SQS.

        Args:
            message: Domain message to serialize

        Returns:
            Dictionary representation suitable for SQS message body
        """
        raise NotImplementedError

    @abstractmethod
    def _deserialize_message(
        self, raw_message: Dict[str, Any]
    ) -> TQueueMessage:
        """Deserialize an SQS message to a domain queue message.

        Args:
            raw_message: Raw message from SQS
                (includes Body, ReceiptHandle, etc.)

        Returns:
            Domain queue message object
        """
        raise NotImplementedError

    async def send_message(
        self,
        message: TMessage,
        message_attributes: Dict[str, Any] | None = None,
    ) -> str:
        """Send a message to the queue.

        Args:
            message: Domain message to send
            message_attributes: Optional SQS message attributes

        Returns:
            Message ID

        Raises:
            Exception: If sending the message fails
        """
        message_body = self._serialize_message(message)
        message_id = await self.sqs_client.send_message(
            queue_url=self.queue_url,
            message_body=message_body,
            message_attributes=message_attributes,
        )
        logger.debug(f"Sent message {message_id} to queue {self.queue_url}")
        return message_id

    async def receive_messages(
        self, max_messages: int = 1, wait_time_seconds: int = 20
    ) -> List[TQueueMessage]:
        """Receive messages from the queue.

        Args:
            max_messages: Maximum number of messages to receive
            wait_time_seconds: Long polling wait time

        Returns:
            List of domain queue message objects

        Raises:
            Exception: If receiving messages fails
        """
        raw_messages = await self.sqs_client.receive_messages(
            queue_url=self.queue_url,
            max_messages=max_messages,
            wait_time_seconds=wait_time_seconds,
        )

        messages = []
        for raw_message in raw_messages:
            try:
                messages.append(self._deserialize_message(raw_message))
            except (ValueError, KeyError, TypeError) as e:
                logger.error(
                    f"Failed to deserialize message from {self.queue_url}: {e}"
                )
                # Continue processing other messages
                continue

        return messages

    async def delete_message(self, receipt_handle: str) -> None:
        """Delete a processed message from the queue.

        Args:
            receipt_handle: Receipt handle of the message to delete

        Raises:
            Exception: If deleting the message fails
        """
        await self.sqs_client.delete_message(
            queue_url=self.queue_url, receipt_handle=receipt_handle
        )
        logger.debug(f"Deleted message from queue {self.queue_url}")

    async def get_queue_status(self) -> Dict[str, Any]:
        """Get queue status information.

        Returns:
            Dictionary containing queue attributes and message counts

        Raises:
            Exception: If getting queue attributes fails
        """
        try:
            attributes = await self.sqs_client.get_queue_attributes(
                queue_url=self.queue_url
            )

            return {
                "queue_url": self.queue_url,
                "approximate_messages": int(
                    attributes.get("ApproximateNumberOfMessages", "0")
                ),
                "approximate_messages_not_visible": int(
                    attributes.get(
                        "ApproximateNumberOfMessagesNotVisible", "0"
                    )
                ),
                "approximate_messages_delayed": int(
                    attributes.get("ApproximateNumberOfMessagesDelayed", "0")
                ),
            }

        except (ValueError, KeyError) as e:
            logger.error(
                f"Failed to get queue status for {self.queue_url}: {e}"
            )
            raise
