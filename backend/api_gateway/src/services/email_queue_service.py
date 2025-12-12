"""
API Gateway Email Queue Service.

This service handles sending email messages to the email SQS queue.
"""

import json
from datetime import datetime, timezone

from loguru import logger
from shared.aws.config import AWSConfig
from shared.aws.sqs_client import SQSClient
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    EmailMessage,
    EmailPriority,
    EmailType,
    Language,
)

from src.config import config
from src.services.base_service import BaseService


class EmailQueueService(BaseService):
    """
    Service for enqueueing email messages to SQS.

    This service provides methods for sending different types of emails
    (team invitations, campaign notifications, schedule publications)
    via an SQS queue that triggers a Lambda email processor.
    """

    def __init__(
        self,
        collection: DatabaseCollections,
        sqs_client: SQSClient,
        queue_url: str,
    ):
        """Initialize the service.

        Args:
            collection: Database collections
            sqs_client: SQS client for sending messages
            queue_url: URL of the email SQS queue
        """
        super().__init__(collection)
        self.sqs_client = sqs_client
        self.queue_url = queue_url

    async def _enqueue_email(self, email_message: EmailMessage) -> str:
        """
        Internal method to enqueue an email message to SQS.

        Args:
            email_message: Email message to enqueue

        Returns:
            SQS message ID

        Raises:
            Exception: If message fails to enqueue
        """
        try:
            logger.info(
                f"Enqueueing email: type={email_message.email_type}, "
                f"to={email_message.to_address}, "
                f"template={email_message.template_name}"
            )

            # Convert to dict for SQS
            message_body = email_message.to_dict()

            # Send to SQS
            response = self.sqs_client.send_message(
                queue_url=self.queue_url,
                message_body=json.dumps(message_body),
            )

            message_id = response.get("MessageId")
            logger.info(
                f"Email enqueued successfully: message_id={message_id}, "
                f"email_type={email_message.email_type}"
            )

            return message_id

        except Exception as e:
            logger.error(
                f"Failed to enqueue email: type={email_message.email_type}, "
                f"to={email_message.to_address}, error={str(e)}"
            )
            raise

    async def enqueue_team_invitation(
        self,
        to_address: str,
        recipient_name: str,
        sender_name: str,
        team_name: str,
        invitation_link: str,
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a team invitation email.

        Args:
            to_address: Recipient email address
            recipient_name: Name of the recipient
            sender_name: Name of the person sending the invitation
            team_name: Name of the team
            invitation_link: Link to accept the invitation
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="team_invitation_email",
            context={
                "subject": "Your invitation to join a team on Rockilus",
                "recipient_name": recipient_name,
                "sender_name": sender_name,
                "team_name": team_name,
                "invitation_link": invitation_link,
            },
            language=language.value,
            priority=EmailPriority.HIGH,
            email_type=EmailType.TEAM_INVITATION,
            created_at=datetime.now(tz=timezone.utc),
        )

        return await self._enqueue_email(email_message)

    async def enqueue_campaign_started(
        self,
        to_address: str,
        recipient_name: str,
        team_name: str,
        campaign_start_date: str,
        campaign_end_date: str,
        campaign_duration_days: int,
        campaign_link: str,
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a campaign started notification email.

        Args:
            to_address: Recipient email address
            recipient_name: Name of the recipient
            team_name: Name of the team
            campaign_start_date: Start date of the campaign (formatted)
            campaign_end_date: End date of the campaign (formatted)
            campaign_duration_days: Duration in days
            campaign_link: Link to view the campaign
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="campaign_started_email",
            context={
                "subject": "New Campaign Started",
                "recipient_name": recipient_name,
                "team_name": team_name,
                "campaign_start_date": campaign_start_date,
                "campaign_end_date": campaign_end_date,
                "campaign_duration_days": campaign_duration_days,
                "campaign_link": campaign_link,
            },
            language=language.value,
            priority=EmailPriority.NORMAL,
            email_type=EmailType.CAMPAIGN_STARTED,
            created_at=datetime.now(tz=timezone.utc),
        )

        return await self._enqueue_email(email_message)

    async def enqueue_schedule_published(
        self,
        to_address: str,
        recipient_name: str,
        team_name: str,
        schedule_start_date: str,
        schedule_end_date: str,
        schedule_duration_days: int,
        validation_date: str,
        schedule_link: str,
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a schedule published notification email.

        Args:
            to_address: Recipient email address
            recipient_name: Name of the recipient
            team_name: Name of the team
            schedule_start_date: Start date of the schedule (formatted)
            schedule_end_date: End date of the schedule (formatted)
            schedule_duration_days: Duration in days
            validation_date: Date when schedule was validated (formatted)
            schedule_link: Link to view the schedule
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="schedule_published_email",
            context={
                "subject": "Schedule Published",
                "recipient_name": recipient_name,
                "team_name": team_name,
                "schedule_start_date": schedule_start_date,
                "schedule_end_date": schedule_end_date,
                "schedule_duration_days": schedule_duration_days,
                "validation_date": validation_date,
                "schedule_link": schedule_link,
            },
            language=language.value,
            priority=EmailPriority.NORMAL,
            email_type=EmailType.SCHEDULE_PUBLISHED,
            created_at=datetime.now(tz=timezone.utc),
        )

        return await self._enqueue_email(email_message)


def create_email_queue_service(
    collection: DatabaseCollections,
) -> EmailQueueService:
    """
    Factory function to create an EmailQueueService instance.

    Args:
        collection: Database collections

    Returns:
        Configured EmailQueueService instance
    """
    # Create AWS config
    aws_config = AWSConfig(
        region=config.aws_region,
        access_key_id=config.aws_access_key_id,
        secret_access_key=config.aws_secret_access_key,
        session_token=config.aws_session_token,
        localstack_endpoint=config.localstack_endpoint,
    )

    # Create SQS client
    sqs_client = SQSClient(aws_config)

    # Get queue URL from config
    queue_url = config.email_queue_url

    if not queue_url:
        logger.warning(
            "EMAIL_QUEUE_URL not configured. Email service will not function."
        )

    return EmailQueueService(
        collection=collection,
        sqs_client=sqs_client,
        queue_url=queue_url,
    )
