"""Email message schemas for NSP Pro email service."""

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EmailType(str, Enum):
    """Type of email to be sent."""

    TEAM_INVITATION = "team_invitation"
    CAMPAIGN_STARTED = "campaign_started"
    SCHEDULE_PUBLISHED = "schedule_published"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    SWAP_INVITATION = "swap_invitation"
    SWAP_BID = "swap_bid"
    SWAP_APPROVED = "swap_approved"
    NOTIFICATION_SCHEDULE_PUBLISHED = "notification_schedule_published"
    NOTIFICATION_REQUEST_DECISION = "notification_request_decision"
    NOTIFICATION_SWAP_REQUEST = "notification_swap_request"
    NOTIFICATION_ASSIGNMENT_CHANGED = "notification_assignment_changed"
    NOTIFICATION_SWAP_STATUS_CHANGED = "notification_swap_status_changed"
    NOTIFICATION_USER_RECEIVED_TEAM_INVITE = "notification_user_received_team_invite"
    NOTIFICATION_USER_ACCEPTED_TEAM_INVITE = "notification_user_accepted_team_invite"
    NOTIFICATION_USER_REMOVED_FROM_TEAM = "notification_user_removed_from_team"
    NOTIFICATION_USER_LEFT_TEAM = "notification_user_left_team"


class EmailPriority(str, Enum):
    """Priority level for email sending."""

    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class EmailMessage(BaseModel):
    """Message schema for email sending via SQS."""

    to_address: str = Field(..., description="Recipient email address")
    template_name: str = Field(..., description="Name of the email template")
    context: Dict[str, Any] = Field(
        ..., description="Context data for template rendering"
    )
    language: str = Field(default="en", description="Language code (en, es, fr)")
    priority: EmailPriority = Field(
        default=EmailPriority.NORMAL, description="Email priority"
    )
    email_type: EmailType = Field(..., description="Type of email")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When the email request was created",
    )
    message_id: Optional[str] = Field(default=None, description="SQS message ID")
    retry_count: int = Field(default=0, description="Number of retry attempts")

    # pylint: disable=too-few-public-methods
    class Config:
        """Pydantic configuration."""

        use_enum_values = True
        json_encoders = {datetime: lambda v: v.isoformat()}

    def to_dict(self) -> dict:
        """
        Return a dict representation of the message for SQS serialization.
        Converts created_at to float timestamp (seconds since epoch, UTC).
        """
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "created_at" in data and isinstance(data["created_at"], datetime):
            data["created_at"] = data["created_at"].timestamp()
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "EmailMessage":
        """
        Create an instance from a dict representation.
        Converts created_at from float timestamp back to datetime.
        """
        if "created_at" in data and isinstance(data["created_at"], (int, float)):
            data["created_at"] = datetime.fromtimestamp(
                data["created_at"], tz=timezone.utc
            )
        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> "EmailMessage":
        """
        Create an instance from a JSON string representation.
        """
        data = json.loads(json_str)
        return cls.from_dict(data)

    def to_json(self) -> str:
        """
        Convert the message to a JSON string for SQS.
        """
        return json.dumps(self.to_dict())


class EmailQueueMessage(BaseModel):
    """
    Wrapper for an email message received from SQS, including metadata.
    """

    message: EmailMessage
    receipt_handle: str
    message_id: str
