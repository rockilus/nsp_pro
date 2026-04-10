"""Email queue service for NSP Pro."""

from typing import Any, Dict

from ..schemas.core.email import EmailMessage, EmailQueueMessage
from .queue_service import QueueService


class EmailQueueService(QueueService[EmailMessage, EmailQueueMessage]):
    """Service for managing email messages via SQS."""

    def _serialize_message(self, message: EmailMessage) -> Dict[str, Any]:
        """Serialize an email message to a dictionary.

        Args:
            message: Email message to serialize

        Returns:
            Dictionary representation
        """
        return message.to_dict()

    def _deserialize_message(self, raw_message: Dict[str, Any]) -> EmailQueueMessage:
        """Deserialize an SQS message to an email queue message.

        Args:
            raw_message: Raw message from SQS

        Returns:
            Email queue message object
        """
        message_body = raw_message.get("Body", "{}")
        message_content = EmailMessage.from_json(message_body)

        return EmailQueueMessage(
            message=message_content,
            receipt_handle=raw_message["ReceiptHandle"],
            message_id=raw_message["MessageId"],
        )
