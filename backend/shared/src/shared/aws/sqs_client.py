"""SQS client for NSP Pro solve service integration."""

import json
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError
from loguru import logger

from .config import AWSConfig


class SQSClient:
    """AWS SQS client for managing solve requests."""

    def __init__(self, config: AWSConfig):
        """Initialize SQS client.

        Args:
            config: AWS configuration.
        """
        self.config = config
        self._sqs_client: Optional[Any] = None

    @property
    def sqs(self) -> Any:
        """Get SQS client instance."""
        if self._sqs_client is None:
            client_kwargs = {
                "region_name": self.config.region,
                "aws_access_key_id": self.config.aws_access_key_id,
                "aws_secret_access_key": self.config.aws_secret_access_key,
                "aws_session_token": self.config.aws_session_token,
                "endpoint_url": self.config.endpoint_url,
            }
            self._sqs_client = boto3.client("sqs", **client_kwargs)
            logger.debug(f"Initialized SQS client with region: {self.config.region}")
        return self._sqs_client

    async def send_message(
        self,
        queue_url: str,
        message_body: Dict[str, Any],
        message_attributes: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Send a message to an SQS queue.

        Args:
            queue_url: URL of the SQS queue
            message_body: Message body as a dictionary
            message_attributes: Optional message attributes

        Returns:
            Message ID

        Raises:
            ClientError: If sending message fails
        """
        try:
            send_params: Dict[str, Any] = {
                "QueueUrl": queue_url,
                "MessageBody": json.dumps(message_body),
            }
            if message_attributes:
                send_params["MessageAttributes"] = message_attributes

            response = self.sqs.send_message(**send_params)
            message_id = response["MessageId"]
            logger.info(f"Sent SQS message {message_id} to queue {queue_url}")
            return message_id

        except ClientError as e:
            logger.error(f"Failed to send SQS message to {queue_url}: {e}")
            raise

    async def send_solve_message(self, message_body: Dict[str, Any]) -> str:
        """Send solve request to SQS.

        Deprecated: Use send_message() with explicit queue URL instead.

        Args:
            message_body: The solve request message body

        Returns:
            Message ID

        Raises:
            ClientError: If sending message fails
        """
        message_attributes = {
            "ScheduleId": {
                "StringValue": message_body.get("schedule_id", ""),
                "DataType": "String",
            },
        }
        return await self.send_message(
            queue_url=self.config.sqs_solve_queue_url,
            message_body=message_body,
            message_attributes=message_attributes,
        )

    async def receive_messages(
        self,
        queue_url: str,
        max_messages: int = 1,
        wait_time_seconds: int = 20,
    ) -> List[Dict[str, Any]]:
        """Receive messages from an SQS queue.

        Args:
            queue_url: URL of the SQS queue
            max_messages: Maximum number of messages to receive
            wait_time_seconds: Long polling wait time

        Returns:
            List of messages

        Raises:
            ClientError: If receiving messages fails
        """
        try:
            response = self.sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time_seconds,
                MessageAttributeNames=["All"],
            )

            return response.get("Messages", [])

        except ClientError as e:
            logger.error(f"Failed to receive SQS messages from {queue_url}: {e}")
            raise

    async def delete_message(self, queue_url: str, receipt_handle: str) -> None:
        """Delete processed message from SQS.

        Args:
            queue_url: URL of the SQS queue
            receipt_handle: Receipt handle of the message to delete

        Raises:
            ClientError: If deleting message fails
        """
        try:
            self.sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
            logger.debug(f"Deleted SQS message from {queue_url}")

        except ClientError as e:
            logger.error(f"Failed to delete SQS message from {queue_url}: {e}")
            raise

    async def get_queue_attributes(self, queue_url: str) -> Dict[str, str]:
        """Get queue attributes including message counts.

        Args:
            queue_url: URL of the SQS queue

        Returns:
            Dictionary of queue attributes

        Raises:
            ClientError: If getting attributes fails
        """
        try:
            response = self.sqs.get_queue_attributes(
                QueueUrl=queue_url,
                AttributeNames=[
                    "ApproximateNumberOfMessages",
                    "ApproximateNumberOfMessagesNotVisible",
                    "ApproximateNumberOfMessagesDelayed",
                ],
            )
            return response["Attributes"]

        except ClientError as e:
            logger.error(f"Failed to get SQS queue attributes: {e}")
            raise
