import logging
import os
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
            logger.error("Failed to send email: %s", e.response["Error"]["Message"])
            raise
        except Exception as e:
            logger.error("An unexpected error occurred while sending email: %s", e)
            raise

    def send_template_email(
        self,
        to_address: str,
        template_name: str,
        context: Dict,
        language: Language = Language.EN,
    ):
        """Send an email using a template."""
        subject, html_body = self._render_template(
            template_name=template_name, context=context, language=language
        )
        self.send_email(to_addresses=[to_address], subject=subject, html_body=html_body)

    def _render_template(self, template_name: str, context: Dict, language: Language):
        """Render the email template based on the template name and language."""
        try:
            # Load the template file based on the name and language
            current_folder = os.path.dirname(__file__)
            template_path = f"templates/{language.value}/{template_name}.html"
            file_path = os.path.join(current_folder, template_path)
            with open(file=file_path, mode="r", encoding="utf-8") as template_file:
                template = template_file.read()

            # Replace placeholders in the template with context values
            html_body = template.format(**context)

            # Extract the subject from the context
            subject = context.get("subject", "No Subject")
            return subject, html_body
        except FileNotFoundError:
            logger.error("Template not found: %s", template_name)
            raise
        except Exception as e:
            logger.error("Failed to render template: %s", e)
            raise
