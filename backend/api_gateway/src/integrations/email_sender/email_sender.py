import logging
from typing import Dict, List

import boto3  # type: ignore
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore
from shared.schemas.core import Language

from src.config import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailSender:
    def __init__(self):
        self.client = self._initialize_client()

    def _initialize_client(self):
        """Initialize the AWS SES client based on the environment."""
        try:
            if config.environment == "development":
                session = boto3.Session(profile_name="felipe_kharaba_dev")
                credentials = session.get_credentials()
                return boto3.client(
                    "ses",
                    aws_access_key_id=credentials.access_key,
                    aws_secret_access_key=credentials.secret_key,
                    region_name="eu-west-3",
                )
            return boto3.client("ses", region_name="eu-west-3")
        except BotoCoreError as e:
            logger.error("Failed to initialize AWS SES client: %s", e)
            raise

    def send_email(
        self,
        to_addresses: List[str],
        subject: str,
        html_body: str,
        cc_addresses: List[str] | None = None,
    ):
        """Send an email using AWS SES."""
        try:
            response = self.client.send_email(
                Source="noreply@rockilus.com",
                Destination={
                    "ToAddresses": to_addresses,
                    "CcAddresses": cc_addresses or [],
                },
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {"Data": html_body, "Charset": "UTF-8"},
                    },
                },
            )
            logger.info("Email sent successfully: %s", response)
        except ClientError as e:
            logger.error(
                "Failed to send email: %s", e.response["Error"]["Message"]
            )
            raise
        except Exception as e:
            logger.error(
                "An unexpected error occurred while sending email: %s", e
            )
            raise

    def send_template_email(
        self,
        to_address: str,
        template_name: str,
        context: Dict,
        language: Language = Language.EN,
    ):
        """
        Send an email using a template.

        DEPRECATED: This method is deprecated. Templates are now managed
        in infrastructure (S3) and rendered by Lambda email processor.
        Use EmailQueueService to enqueue emails for async processing.
        """
        logger.warning(
            "send_template_email is deprecated. Use EmailQueueService. "
            "Template: %s, Language: %s",
            template_name,
            language.value,
        )
        raise NotImplementedError(
            "Template rendering moved to Lambda. "
            "Use EmailQueueService to enqueue emails."
        )
