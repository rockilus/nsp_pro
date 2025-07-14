"""
User context extraction from API Gateway headers.
Handles Cognito user information passed from API Gateway.
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class UserContext:
    """User context extracted from API Gateway headers"""

    user_id: str
    email: Optional[str] = None
    groups: Optional[List[str]] = None
    request_id: Optional[str] = None
    source_ip: Optional[str] = None

    def __post_init__(self):
        if self.groups is None:
            self.groups = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/serialization"""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "groups": self.groups,
            "request_id": self.request_id,
            "source_ip": self.source_ip,
        }

    def get_user_id(self) -> str:
        """Compatibility method to match SessionContainerType interface"""
        return self.user_id


def extract_user_context(
    x_user_sub: Optional[str] = None,
    x_user_email: Optional[str] = None,
    x_user_groups: Optional[str] = None,
    x_request_id: Optional[str] = None,
    x_source_ip: Optional[str] = None,
) -> UserContext:
    """
    Extract user context from API Gateway headers.

    Args:
        x_user_sub: User ID from Cognito (required)
        x_user_email: User email from Cognito
        x_user_groups: Comma-separated user groups from Cognito
        x_request_id: API Gateway request ID
        x_source_ip: Source IP address

    Returns:
        UserContext: Extracted user context

    Raises:
        ValueError: If required user context is missing
    """
    if not x_user_sub:
        logger.error(
            "Missing required user context: X-User-Sub header not found"
        )
        raise ValueError("User context missing - authentication required")

    # Parse groups if provided
    user_groups = []
    if x_user_groups:
        # Handle comma-separated groups and clean whitespace
        user_groups = [
            group.strip()
            for group in x_user_groups.split(",")
            if group.strip()
        ]

    user_context = UserContext(
        user_id=x_user_sub,
        email=x_user_email,
        groups=user_groups,
        request_id=x_request_id,
        source_ip=x_source_ip,
    )

    logger.debug("Extracted user context for user %s", x_user_sub)
    return user_context
