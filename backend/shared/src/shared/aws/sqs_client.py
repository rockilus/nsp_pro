"""SQS client for NSP Pro solve service integration."""

import json
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError
from loguru import logger

from .config import AWSConfig


class SQSClient:
    """AWS SQS client for managing solve requests."""

    def __init__(self, config: Optional[AWSConfig] = None):
        """Initialize SQS client.

        Args:
            config: AWS configuration. If None, uses default config.
        """
        self.config = config or AWSConfig()
        self._sqs_client: Optional[Any] = None
        self.solve_queue_url: Optional[str] = None
        self.dlq_url: Optional[str] = None
        self._initialized = False

    @property
    def sqs(self) -> Any:
        """Get SQS client instance."""
        if self._sqs_client is None:
            session = boto3.Session(
                aws_access_key_id=self.config.access_key_id,
                aws_secret_access_key=self.config.secret_access_key,
                region_name=self.config.region,
            )
            self._sqs_client = session.client("sqs")
        return self._sqs_client

    async def initialize_queues(self) -> None:
        """Initialize SQS queues for solve service."""
        if self._initialized:
            return

        try:
            # Create or get DLQ first
            await self._ensure_dlq_exists()

            # Create or get main solve queue with DLQ
            await self._ensure_solve_queue_exists()

            self._initialized = True
            logger.info(
                f"SQS queues initialized: {self.solve_queue_url}, "
                f"DLQ: {self.dlq_url}"
            )

        except ClientError as e:
            logger.error(f"Failed to initialize SQS queues: {e}")
            raise

    async def _ensure_dlq_exists(self) -> None:
        """Ensure DLQ exists and get its URL."""
        try:
            # Try to get existing queue
            response = self.sqs.get_queue_url(
                QueueName=self.config.sqs_solve_dlq_name
            )
            self.dlq_url = response["QueueUrl"]
            logger.info(f"Using existing DLQ: {self.dlq_url}")

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "AWS.SimpleQueueService.NonExistentQueue":
                # Create new DLQ
                response = self.sqs.create_queue(
                    QueueName=self.config.sqs_solve_dlq_name,
                    Attributes={
                        "MessageRetentionPeriod": str(
                            self.config.sqs_message_retention_period
                        ),
                        "VisibilityTimeoutSeconds": "60",
                    },
                )
                self.dlq_url = response["QueueUrl"]
                logger.info(f"Created new DLQ: {self.dlq_url}")
            else:
                raise

    async def _ensure_solve_queue_exists(self) -> None:
        """Ensure solve queue exists and get its URL."""
        try:
            # Try to get existing queue
            response = self.sqs.get_queue_url(
                QueueName=self.config.sqs_solve_queue_name
            )
            self.solve_queue_url = response["QueueUrl"]
            logger.info(f"Using existing solve queue: {self.solve_queue_url}")

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "AWS.SimpleQueueService.NonExistentQueue":
                # Get DLQ ARN for redrive policy
                dlq_attributes = self.sqs.get_queue_attributes(
                    QueueUrl=self.dlq_url, AttributeNames=["QueueArn"]
                )
                dlq_arn = dlq_attributes["Attributes"]["QueueArn"]

                # Create new solve queue with DLQ
                response = self.sqs.create_queue(
                    QueueName=self.config.sqs_solve_queue_name,
                    Attributes={
                        "VisibilityTimeoutSeconds": str(
                            self.config.sqs_visibility_timeout_seconds
                        ),
                        "MessageRetentionPeriod": str(
                            self.config.sqs_message_retention_period
                        ),
                        "ReceiveMessageWaitTimeSeconds": str(
                            self.config.sqs_receive_message_wait_time
                        ),
                        "RedrivePolicy": json.dumps(
                            {
                                "deadLetterTargetArn": dlq_arn,
                                "maxReceiveCount": (
                                    self.config.sqs_max_receive_count
                                ),
                            }
                        ),
                    },
                )
                self.solve_queue_url = response["QueueUrl"]
                logger.info(f"Created new solve queue: {self.solve_queue_url}")
            else:
                raise

    async def send_solve_message(
        self, message_body: Dict[str, Any], delay_seconds: int = 0
    ) -> str:
        """Send solve request to SQS.

        Args:
            message_body: The solve request message body
            delay_seconds: Delay before message becomes available

        Returns:
            Message ID

        Raises:
            ClientError: If sending message fails
        """
        if not self._initialized:
            await self.initialize_queues()

        try:
            response = self.sqs.send_message(
                QueueUrl=self.solve_queue_url,
                MessageBody=json.dumps(message_body),
                DelaySeconds=delay_seconds,
                MessageAttributes={
                    "ScheduleId": {
                        "StringValue": message_body.get("schedule_id", ""),
                        "DataType": "String",
                    },
                    "Priority": {
                        "StringValue": message_body.get("priority", "normal"),
                        "DataType": "String",
                    },
                    "RequestType": {
                        "StringValue": message_body.get(
                            "request_type", "full_solve"
                        ),
                        "DataType": "String",
                    },
                },
            )
            message_id = response["MessageId"]
            logger.info(
                f"Sent SQS message {message_id} for schedule "
                f"{message_body.get('schedule_id')}"
            )
            return message_id

        except ClientError as e:
            logger.error(f"Failed to send SQS message: {e}")
            raise

    async def receive_messages(
        self, max_messages: int = 1, wait_time_seconds: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Receive messages from solve queue.

        Args:
            max_messages: Maximum number of messages to receive
            wait_time_seconds: Long polling wait time

        Returns:
            List of messages

        Raises:
            ClientError: If receiving messages fails
        """
        if not self._initialized:
            await self.initialize_queues()

        wait_time = (
            wait_time_seconds
            if wait_time_seconds is not None
            else self.config.sqs_receive_message_wait_time
        )

        try:
            response = self.sqs.receive_message(
                QueueUrl=self.solve_queue_url,
                MaxNumberOfMessages=max_messages,
                WaitTimeSeconds=wait_time,
                MessageAttributeNames=["All"],
            )

            return response.get("Messages", [])

        except ClientError as e:
            logger.error(f"Failed to receive SQS messages: {e}")
            raise

    async def delete_message(self, receipt_handle: str) -> None:
        """Delete processed message from SQS.

        Args:
            receipt_handle: Receipt handle of the message to delete

        Raises:
            ClientError: If deleting message fails
        """
        if not self._initialized:
            await self.initialize_queues()

        try:
            self.sqs.delete_message(
                QueueUrl=self.solve_queue_url, ReceiptHandle=receipt_handle
            )
            logger.debug(f"Deleted SQS message with handle: {receipt_handle}")

        except ClientError as e:
            logger.error(f"Failed to delete SQS message: {e}")
            raise

    async def get_queue_attributes(self) -> Dict[str, str]:
        """Get queue attributes including message counts.

        Returns:
            Dictionary of queue attributes

        Raises:
            ClientError: If getting attributes fails
        """
        if not self._initialized:
            await self.initialize_queues()

        try:
            response = self.sqs.get_queue_attributes(
                QueueUrl=self.solve_queue_url,
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
