import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Template cache to avoid repeated S3 reads
TEMPLATE_CACHE: Dict[str, str] = {}


@lru_cache(maxsize=1)
def get_s3_client():
    """Get S3 client with proper region configuration."""
    region = os.environ.get("AWS_REGION_CUSTOM", "eu-west-3")
    return boto3.client("s3", region_name=region)


@lru_cache(maxsize=1)
def get_ses_client():
    """Get SES client with proper region configuration."""
    region = os.environ.get("AWS_REGION_CUSTOM", "eu-west-3")
    return boto3.client("ses", region_name=region)


def get_template_from_s3(template_name: str, language: str) -> Optional[str]:
    """
    Fetch email template from S3 bucket.
    Templates are organized as: {language}/{template_name}.html
    Uses local cache to minimize S3 reads.
    """
    cache_key = f"{language}/{template_name}"

    # Check cache first
    if cache_key in TEMPLATE_CACHE:
        logger.info("Template cache hit: %s", cache_key)
        return TEMPLATE_CACHE[cache_key]

    try:
        s3 = get_s3_client()
        bucket_name = os.environ.get("S3_TEMPLATES_BUCKET")

        if not bucket_name:
            logger.error("S3_TEMPLATES_BUCKET environment variable not set")
            return None

        # Template path: {language}/{template_name}.html
        template_key = f"{language}/{template_name}.html"

        logger.info(
            "Fetching template from S3: s3://%s/%s", bucket_name, template_key
        )

        response = s3.get_object(Bucket=bucket_name, Key=template_key)
        template_content = response["Body"].read().decode("utf-8")

        # Cache the template
        TEMPLATE_CACHE[cache_key] = template_content
        logger.info("Template cached: %s", cache_key)

        return template_content

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.error(
            "Failed to fetch template from S3: %s - %s (bucket=%s, key=%s)",
            error_code,
            str(e),
            bucket_name,
            template_key,
        )
        return None


def render_template(template: str, context: Dict[str, Any]) -> str:
    """
    Render email template with context using Python string formatting.
    Matches the current EmailSender implementation.
    """
    try:
        return template.format(**context)
    except KeyError as e:
        logger.error("Missing template variable: %s", str(e))
        raise
    except Exception as e:
        logger.error("Template rendering error: %s", str(e))
        raise


def send_email_via_ses(
    to_address: str,
    subject: str,
    html_body: str,
    from_email: Optional[str] = None,
    configuration_set: Optional[str] = None,
) -> bool:
    """
    Send email using AWS SES.
    Returns True on success, False on failure.
    """
    try:
        ses = get_ses_client()

        from_email = from_email or os.environ.get(
            "SES_FROM_EMAIL", "noreply@rockilus.com"
        )

        message = {
            "Source": from_email,
            "Destination": {"ToAddresses": [to_address]},
            "Message": {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
            },
        }

        # Add configuration set if provided
        if configuration_set:
            message["ConfigurationSetName"] = configuration_set

        logger.info(
            "Sending email to %s with subject: %s", to_address, subject
        )

        response = ses.send_email(**message)
        message_id = response.get("MessageId")

        logger.info("Email sent successfully. SES MessageId: %s", message_id)
        return True

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))
        logger.error(
            "Failed to send email via SES: %s - %s (to=%s)",
            error_code,
            error_message,
            to_address,
        )
        return False


def process_email_message(message_body: Dict[str, Any]) -> bool:
    """
    Process a single email message from SQS.
    Returns True on success, False on failure.
    """
    try:
        # Extract email message fields
        to_address = message_body.get("to_address")
        template_name = message_body.get("template_name")
        context = message_body.get("context", {})
        language = message_body.get("language", "en")

        # Validate required fields
        if not to_address:
            logger.error("Missing to_address in message")
            return False

        if not template_name:
            logger.error("Missing template_name in message")
            return False

        logger.info(
            "Processing email: to=%s, template=%s, language=%s",
            to_address,
            template_name,
            language,
        )

        # Fetch template from S3
        template = get_template_from_s3(template_name, language)
        if not template:
            logger.error("Failed to fetch template: %s", template_name)
            return False

        # Render template with context
        html_body = render_template(template, context)

        # Extract subject from context
        subject = context.get("subject", "No Subject")

        # Send email via SES
        configuration_set = os.environ.get("SES_CONFIGURATION_SET")
        success = send_email_via_ses(
            to_address=to_address,
            subject=subject,
            html_body=html_body,
            configuration_set=configuration_set if configuration_set else None,
        )

        return success

    except Exception as e:
        logger.error(
            "Error processing email message: %s", str(e), exc_info=True
        )
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for processing email messages from SQS.

    The function processes messages in batches and reports partial failures
    back to SQS for retry.
    """
    logger.info(
        "Email processor Lambda invoked with %d records",
        len(event.get("Records", [])),
    )

    failed_message_ids: List[str] = []

    for record in event.get("Records", []):
        try:
            message_id = record.get("messageId")
            receipt_handle = record.get("receiptHandle")

            logger.info("Processing message: %s", message_id)

            # Parse message body
            message_body = json.loads(record.get("body", "{}"))

            # Process the email message
            success = process_email_message(message_body)

            if not success:
                logger.error("Failed to process message: %s", message_id)
                failed_message_ids.append(message_id)
            else:
                logger.info("Successfully processed message: %s", message_id)

        except json.JSONDecodeError as e:
            logger.error("Invalid JSON in message body: %s", str(e))
            failed_message_ids.append(record.get("messageId"))
        except Exception as e:
            logger.error(
                "Unexpected error processing message: %s",
                str(e),
                exc_info=True,
            )
            failed_message_ids.append(record.get("messageId"))

    # Return batch item failures for SQS to retry
    if failed_message_ids:
        logger.warning(
            "Failed to process %d messages", len(failed_message_ids)
        )
        return {
            "batchItemFailures": [
                {"itemIdentifier": msg_id} for msg_id in failed_message_ids
            ]
        }

    logger.info("All messages processed successfully")
    return {"batchItemFailures": []}
