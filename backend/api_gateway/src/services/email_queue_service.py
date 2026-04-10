"""
API Gateway Email Queue Service.

This service handles sending email messages to the email SQS queue.
"""

from datetime import datetime, timezone

from loguru import logger
from shared.aws.config import create_aws_config
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

            # Send to SQS (returns message ID directly)
            message_id = await self.sqs_client.send_message(
                queue_url=self.queue_url,
                message_body=message_body,
            )
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

    # pylint: disable=too-many-arguments, too-many-positional-arguments
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

    async def enqueue_direct_swap_invitation(
        self,
        to_address: str,
        recipient_name: str,
        creator_name: str,
        team_name: str,
        swap_link: str,
        comment: str = "",
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a direct swap invitation email.

        Args:
            to_address: Recipient email address
            recipient_name: Name of the target worker
            creator_name: Name of the worker who created the swap
            team_name: Name of the team
            swap_link: Link to view and accept/decline the swap
            comment: Optional comment from the creator
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="direct_swap_invitation_email",
            context={
                "subject": f"Swap Invitation from {creator_name}",
                "recipient_name": recipient_name,
                "creator_name": creator_name,
                "team_name": team_name,
                "swap_link": swap_link,
                "comment": comment,
            },
            language=language.value,
            priority=EmailPriority.HIGH,
            email_type=EmailType.SWAP_INVITATION,
            created_at=datetime.now(tz=timezone.utc),
        )

        return await self._enqueue_email(email_message)

    async def enqueue_open_swap_new_bid(
        self,
        to_address: str,
        recipient_name: str,
        bidder_name: str,
        team_name: str,
        swap_link: str,
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a notification for a new bid on an open swap.

        Args:
            to_address: Recipient email address (swap creator)
            recipient_name: Name of the swap creator
            bidder_name: Name of the worker who placed the bid
            team_name: Name of the team
            swap_link: Link to view the swap and bids
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="open_swap_new_bid_email",
            context={
                "subject": f"New Bid on Your Swap Request from {bidder_name}",
                "recipient_name": recipient_name,
                "bidder_name": bidder_name,
                "team_name": team_name,
                "swap_link": swap_link,
            },
            language=language.value,
            priority=EmailPriority.NORMAL,
            email_type=EmailType.SWAP_BID,
            created_at=datetime.now(tz=timezone.utc),
        )

        return await self._enqueue_email(email_message)

    async def enqueue_notification(
        self,
        to_address: str,
        template_name: str,
        email_type: EmailType,
        context: dict,
        language: str = "en",
    ) -> str:
        """
        Enqueue a generic notification email.

        Args:
            to_address: Recipient email address
            template_name: Name of the email template
            email_type: EmailType enum value
            context: Template context dict
            language: Language code string (en/es/fr)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name=template_name,
            context=context,
            language=language,
            priority=EmailPriority.NORMAL,
            email_type=email_type,
            created_at=datetime.now(tz=timezone.utc),
        )
        return await self._enqueue_email(email_message)

    async def enqueue_swap_approved(
        self,
        to_address: str,
        recipient_name: str,
        approver_name: str,
        team_name: str,
        schedule_link: str,
        language: Language = Language.EN,
    ) -> str:
        """
        Enqueue a notification for an approved swap.

        Args:
            to_address: Recipient email address (worker involved in swap)
            recipient_name: Name of the worker
            approver_name: Name of the team leader who approved
            team_name: Name of the team
            schedule_link: Link to view the updated schedule
            language: Language for the email (default: EN)

        Returns:
            SQS message ID
        """
        email_message = EmailMessage(
            to_address=to_address,
            template_name="swap_approved_email",
            context={
                "subject": "Your Swap Request Has Been Approved",
                "recipient_name": recipient_name,
                "approver_name": approver_name,
                "team_name": team_name,
                "schedule_link": schedule_link,
            },
            language=language.value,
            priority=EmailPriority.HIGH,
            email_type=EmailType.SWAP_APPROVED,
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

    if not config.sqs_email_queue_url:
        logger.warning(
            "SQS_EMAIL_QUEUE_URL not configured. Email service will not function."
        )

    # Create AWS config using shared factory
    aws_config = create_aws_config(config)
    sqs_client = SQSClient(aws_config)

    return EmailQueueService(
        collection=collection,
        sqs_client=sqs_client,
        queue_url=config.sqs_email_queue_url or "",
    )
